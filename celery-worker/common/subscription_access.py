from enums.product import PlanAccessLevel


FREE_PLAN_PRODUCT_UUID = "213408a40f5f4cfdaeca8d4c28ccd822"
PRO_PLAN_PRODUCT_UUID = "0a3e8009849f4e4383f19dc687c225ec"
MAX_PLAN_PRODUCT_UUID = "372b0794e3b443b68a0db6a2e6d78f0a"

PRODUCT_UUID_TO_PLAN_LEVEL = {
    FREE_PLAN_PRODUCT_UUID: PlanAccessLevel.FREE,
    PRO_PLAN_PRODUCT_UUID: PlanAccessLevel.PRO,
    MAX_PLAN_PRODUCT_UUID: PlanAccessLevel.MAX,
}

SUBSCRIPTION_REQUIRED_ERROR_MESSAGE = (
    "Paid subscription required."
)


def normalize_plan_access_level(
    value: int | PlanAccessLevel | None,
) -> PlanAccessLevel:
    try:
        return PlanAccessLevel(int(value or PlanAccessLevel.FREE))
    except (TypeError, ValueError):
        return PlanAccessLevel.FREE


def get_plan_access_level_from_product_uuid(
    product_uuid: str | None,
) -> PlanAccessLevel:
    if not product_uuid:
        return PlanAccessLevel.FREE
    return PRODUCT_UUID_TO_PLAN_LEVEL.get(
        product_uuid,
        PlanAccessLevel.MAX,
    )


def is_subscription_required_level(
    required_plan_level: int | PlanAccessLevel | None,
) -> bool:
    return normalize_plan_access_level(required_plan_level) > PlanAccessLevel.FREE


def has_plan_level_access(
    *,
    required_plan_level: int | PlanAccessLevel | None,
    user_plan_level: int | PlanAccessLevel | None,
) -> bool:
    normalized_required_plan_level = normalize_plan_access_level(required_plan_level)
    normalized_user_plan_level = normalize_plan_access_level(user_plan_level)
    return normalized_user_plan_level >= normalized_required_plan_level
