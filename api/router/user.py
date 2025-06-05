import crud
import schemas
import jwt
from jwt.exceptions import ExpiredSignatureError
from jose import jwt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Depends
from sqlalchemy.orm import Session
from schemas.error import CustomException
from common.common import create_token
from common.apscheduler.app import scheduler
from common.apscheduler.app import send_daily_report
from common.dependencies import get_db
from common.hash import verify_password
from common.dependencies import get_current_user, get_db
from config.oauth2 import SECRET_KEY, ALGORITHM
from common.cron import time_to_cron, cron_to_time

user_router = APIRouter()

@user_router.post('/default-engine/update', response_model=schemas.common.NormalResponse)
async def update_default_document_parse_engine(default_engine_update_request: schemas.user.DefaultEngineUpdateRequest,
                                               user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                                               db: Session = Depends(get_db)):
    crud.user.update_user_default_engine(db=db, 
                                         user_id=user.id, 
                                         default_document_parse_engine_id=default_engine_update_request.default_document_parse_engine_id,
                                         default_website_crawling_engine_id=default_engine_update_request.default_website_crawling_engine_id)
    db.commit()
    return schemas.common.SuccessResponse(message="The default document parse engine is updated successfully.")

@user_router.post('/default-model/update', response_model=schemas.common.NormalResponse)
async def update_default_model(default_model_update_request: schemas.user.DefaultModelUpdateRequest,
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    crud.user.update_user_default_model(db=db, 
                                        user_id=user.id, 
                                        default_document_reader_model_id=default_model_update_request.default_document_reader_model_id, 
                                        default_revornix_model_id=default_model_update_request.default_revornix_model_id)
    db.commit()
    return schemas.common.SuccessResponse(message="The default model is updated successfully.")

@user_router.post('/daily-report', response_model=schemas.common.NormalResponse)
async def daily_report(daily_report_status_change_request: schemas.user.DailyReportStatusChangeRequest,
                       user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    db_report_task = crud.task.get_user_daily_report_task(db=db, 
                                                          user_id=user.id)
    if daily_report_status_change_request.status == True:
        cron_expr = time_to_cron(daily_report_status_change_request.run_time)
        if db_report_task is None:
            db_report_task = crud.task.create_cron_task(db=db,
                                                        user_id=user.id,
                                                        cron_expr=cron_expr,
                                                        title='每日报告',
                                                        func_id=1)
            time_obj = datetime.strptime(daily_report_status_change_request.run_time, "%H:%M:%S")
            scheduler.add_job(func=lambda user_id: send_daily_report(user_id), 
                              args=[user.id],
                              trigger='cron', 
                              id=str(db_report_task.id), 
                              hour=time_obj.hour,
                              minute=time_obj.minute,
                              second=time_obj.second)
        else:
            if db_report_task.cron_expr != cron_expr:
                time_obj = datetime.strptime(daily_report_status_change_request.run_time, "%H:%M:%S")
                scheduler.reschedule_job(job_id=str(db_report_task.id), 
                                         trigger='cron', 
                                         hour=time_obj.hour,
                                         minute=time_obj.minute,
                                         second=time_obj.second)
                db_report_task.cron_expr = cron_expr
                db_report_task.update_time = now
            else:
                raise Exception('The same daily report task already exists')
    else:
        if db_report_task is None:
            raise Exception('The daily report task does not exist')
        else:
            crud.task.delete_regular_tasks_by_task_ids(db=db,
                                                       user_id=user.id,
                                                       task_ids=[db_report_task.id])
            scheduler.remove_job(job_id=str(db_report_task.id))
    db.commit()
    return schemas.common.NormalResponse()

@user_router.post('/fans', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
async def search_user_fans(search_user_fans_request: schemas.user.SearchUserFansRequest,
                           user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    has_more = True
    next_start = None
    users = crud.user.search_user_fans(db=db,
                                       user_id=user.id,
                                       start=search_user_fans_request.start,
                                       limit=search_user_fans_request.limit,
                                       keyword=search_user_fans_request.keyword)
    if len(users) < search_user_fans_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_fans_request.limit:
        next_user = crud.user.search_next_user_fan(db=db, 
                                                   user=users[-1],
                                                   keyword=search_user_fans_request.keyword)
        has_more = next_user is not None
        next_start = next_user.id if has_more else None
    total = crud.user.count_user_fans(db=db,
                                      user_id=search_user_fans_request.user_id,
                                      keyword=search_user_fans_request.keyword)
    elements = []
    for user in users:
        element = schemas.user.UserPublicInfo.model_validate(user)
        element.fans = crud.user.count_user_fans(db=db, 
                                                 user_id=user.id)
        element.follows = crud.user.count_user_follows(db=db,
                                                       user_id=user.id)
        elements.append(element)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=search_user_fans_request.start,
        limit=search_user_fans_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@user_router.post('/follows', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.user.UserPublicInfo])
async def search_user_follows(search_user_follows_request: schemas.user.SearchUserFollowsRequest, 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                              db: Session = Depends(get_db)):
    has_more = True
    next_start = None
    users = crud.user.search_user_follows(db=db,
                                          user_id=user.id,
                                          start=search_user_follows_request.start,
                                          limit=search_user_follows_request.limit,
                                          keyword=search_user_follows_request.keyword)
    if len(users) < search_user_follows_request.limit or len(users) == 0:
        has_more = False
    if len(users) == search_user_follows_request.limit:
        next_user = crud.user.search_next_user_follow(db=db, 
                                                      user=users[-1],
                                                      keyword=search_user_follows_request.keyword)
        has_more = next_user is not None
        next_start = next_user.id if has_more else None
    total = crud.user.count_user_follows(db=db,
                                         user_id=search_user_follows_request.user_id,
                                         keyword=search_user_follows_request.keyword)
    elements = []
    for user in users:
        element = schemas.user.UserPublicInfo.model_validate(user)
        element.fans = crud.user.count_user_fans(db=db, 
                                                 user_id=user.id)
        element.follows = crud.user.count_user_follows(db=db,
                                                       user_id=user.id)
        elements.append(element)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=search_user_follows_request.start,
        limit=search_user_follows_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@user_router.post('/follow', response_model=schemas.common.NormalResponse)
async def follow_user(follow_user_request: schemas.user.FollowUserRequest,
                      user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if follow_user_request.to_user_id == user.id:
        raise CustomException(message="You can't follow yourself",
                              code=400)
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=follow_user_request.to_user_id)
    if db_user is None:
        raise CustomException(message="The user you want to follow is not exist",
                              code=404)
    db_user_followed = crud.user.get_user_follow_by_to_user_id_and_from_user_id(db=db,
                                                                                to_user_id=follow_user_request.to_user_id,
                                                                                from_user_id=user.id)
    if db_user_followed is None and follow_user_request.status == True:
        crud.user.create_follow_user_record(db=db,
                                            to_user_id=follow_user_request.to_user_id,
                                            from_user_id=user.id)
    if db_user_followed is not None and follow_user_request.status == False:
        crud.user.update_user_follow_by_to_user_id_and_from_user_id(db=db,
                                                                    to_user_id=follow_user_request.to_user_id,
                                                                    from_user_id=user.id,
                                                                    status=follow_user_request.status)
        
    db.commit()
    return schemas.common.SuccessResponse()

@user_router.post('/info', response_model=schemas.user.UserPublicInfo)
async def user_info(user_info_request: schemas.user.UserInfoRequest,
                    user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_info_request.user_id)
    user_follow = crud.user.get_user_follow_by_to_user_id_and_from_user_id(db=db,
                                                                           to_user_id=user_info_request.user_id,
                                                                           from_user_id=user.id)
    if user_follow is not None and user_follow.delete_at is None:
        db_user.is_followed = True
    fans = crud.user.count_user_fans(db=db,
                                     user_id=user_info_request.user_id)
    follows = crud.user.count_user_follows(db=db,
                                           user_id=user_info_request.user_id)
    db_user.fans = fans
    db_user.follows = follows
    return db_user

@user_router.post('/create/email/verify', response_model=schemas.user.TokenResponse)
async def create_user_by_email_verify(email_user_create_verify_request: schemas.user.EmailUserCreateVerifyRequest, 
                                      db: Session = Depends(get_db)):
    if crud.user.get_user_by_email(db=db, 
                                   email=email_user_create_verify_request.email):
        raise Exception("The email is already exists")
    db_user = crud.user.create_base_user(db=db, 
                                         avatar_attachment_id=1, 
                                         nickname=email_user_create_verify_request.email)
    crud.user.create_email_user(db, 
                                user_id=db_user.id, 
                                email=email_user_create_verify_request.email, 
                                password=email_user_create_verify_request.password,
                                nickname=email_user_create_verify_request.email)
    db.commit()
    access_token, refresh_token = create_token(db_user)
    res = schemas.user.TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=3600)
    return res

@user_router.post('/password/update', response_model=schemas.common.NormalResponse)
async def update_password(password_update_request: schemas.user.PasswordUpdateRequest,
                          user = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    db_email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                        user_id=user.id)
    if db_email_user is None:
        raise CustomException(message='The current user has no email info.')
    if not verify_password(db_email_user.hashed_password, password_update_request.origin_password):
        raise CustomException(message='The origin password is wrong.')
    crud.user.update_user_password(db=db, 
                                   user_id=user.id, 
                                   password=password_update_request.new_password)
    db.commit()
    return schemas.common.SuccessResponse(message="The password is updated successfully.")

@user_router.post('/bind/email/verify', response_model=schemas.common.NormalResponse)
async def bind_email_verify(bind_email_verify_request: schemas.user.BindEmailVerifyRequest,
                            user = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    db_user_email = crud.user.get_email_user_by_user_id(db=db,
                                                        user_id=user.id)
    if db_user_email is None:
        raise CustomException(message='The current user has no email info.')
    crud.user.delete_email_user_by_user_id(db=db,
                                           user_id=user.id)
    crud.user.create_email_user(db=db, 
                                user_id=user.id,
                                email=bind_email_verify_request.email)
    db.commit()
    return schemas.common.SuccessResponse(message="The email is binded successfully.")

@user_router.post('/update', response_model=schemas.common.NormalResponse)
async def update_my_info(user_info_update_request: schemas.user.UserInfoUpdateRequest, 
                         user = Depends(get_current_user), 
                         db: Session = Depends(get_db)):
    crud.user.update_user_info(db=db, 
                               user_id=user.id, 
                               nickname=user_info_update_request.nickname, 
                               avatar_attachment_id=user_info_update_request.avatar_attachment_id, 
                               slogan=user_info_update_request.slogan)
    db.commit()
    return schemas.common.SuccessResponse(message="The information of the user is updated successfully.")

@user_router.post('/password/initial-see', response_model=schemas.user.InitialPasswordResponse)
async def initial_see_password(user = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                     user_id=user.id)
    if email_user is None:
        raise CustomException(message='The current user has no email info.')
    
    if email_user.has_seen_initial_password:
        raise CustomException(message='The current user has seen the initial password.')
    
    email_user.has_seen_initial_password = True
    db.commit()
    
    return schemas.user.InitialPasswordResponse(password=email_user.initial_password)

@user_router.post('/mine/info', response_model=schemas.user.PrivateUserInfo)
async def my_info(user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    res = schemas.user.PrivateUserInfo(id=user.id,
                                       nickname=user.nickname,
                                       slogan=user.slogan,
                                       avatar=user.avatar,
                                       default_document_reader_model_id=user.default_document_reader_model_id,
                                       default_revornix_model_id=user.default_revornix_model_id)
    email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                     user_id=user.id)
    if email_user is not None:
        res.email_info = schemas.user.EmailInfo(email=email_user.email,
                                                is_initial_password=email_user.is_initial_password,
                                                has_seen_initial_password=email_user.has_seen_initial_password)
    fans = crud.user.count_user_fans(db=db,
                                     user_id=user.id)
    follows = crud.user.count_user_follows(db=db,
                                           user_id=user.id)
    res.fans = fans
    res.follows = follows
    db_report_task = crud.task.get_user_daily_report_task(db=db, 
                                                          user_id=user.id)
    if db_report_task is not None:
        res.daily_report_status = True
        res.daily_report_run_time = cron_to_time(db_report_task.cron_expr) 
    return res

# 邮箱密码登陆
@user_router.post("/login", response_model=schemas.user.TokenResponse)
async def login(user_login_request: schemas.user.UserLoginRequest, 
                db: Session = Depends(get_db)):
    user = crud.user.get_user_by_email(db, 
                                       email=user_login_request.email)
    if user is None:
        raise Exception("The email is not registered yet")
    email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                     user_id=user.id)
    if not user or not verify_password(stored_password=email_user.hashed_password, 
                                       provided_password=user_login_request.password):
        raise Exception("Email or password is incorrect")
    access_token, refresh_token = create_token(user)
    res = schemas.user.TokenResponse(access_token=access_token, 
                                     refresh_token=refresh_token, 
                                     expires_in=3600)
    return res

@user_router.post("/token/update", response_model=schemas.user.TokenResponse)
async def update_token(token_update_request: schemas.user.TokenUpdateRequest, 
                       db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token=token_update_request.refresh_token, 
                             key=SECRET_KEY, 
                             algorithms=[ALGORITHM])
    except ExpiredSignatureError as e:
        return Exception("Refresh token is expired, please login again.")
    user_uuid: str | None = payload.get("sub")
    if user_uuid is None:
        raise Exception("Refresh token is invalid")
    user = crud.user.get_user_by_uuid(db=db, 
                                      user_uuid=user_uuid)
    if user is None:
        raise Exception("The user for this refresh_token is not exist")
    access_token, refresh_token = create_token(user)
    res = schemas.user.TokenResponse(access_token=access_token, 
                                     refresh_token=refresh_token, 
                                     expires_in=3600)
    return res

@user_router.post('/delete', response_model=schemas.common.NormalResponse)
async def delete_user(user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    crud.user.delete_user_by_user_id(db=db, 
                                     user_id=user.id)
    db.commit()
    return schemas.common.SuccessResponse(message="The user is deleted successfully.")
