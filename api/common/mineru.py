import requests
import os
import hashlib
from config.base import api_base_url
from config.base import BASE_DIR
from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
from magic_pdf.config.enums import SupportedPdfParseMethod

uid = '82609806'

# 本地方式

def transform_bytes(data: bytes, output_dir: str = str(BASE_DIR / "temp")):
    md_file_name = output_dir.split("/")[-1] + ".md"
    local_image_dir, local_md_dir = f"{output_dir}/images", output_dir
    image_writer, md_writer = FileBasedDataWriter(local_image_dir), FileBasedDataWriter(local_md_dir)
    ds = PymuDocDataset(data)
    if ds.classify() == SupportedPdfParseMethod.OCR:
        infer_result = ds.apply(doc_analyze, ocr=True)
        pipe_result = infer_result.pipe_ocr_mode(image_writer)
    else:
        infer_result = ds.apply(doc_analyze, ocr=False)
        pipe_result = infer_result.pipe_txt_mode(image_writer)
    pipe_result.dump_md(md_writer, md_file_name, local_image_dir)

def transform_local_file(origin_file_path: str, output_dir: str = str(BASE_DIR / "temp"), md_file_name: str = "output.md"):
    local_image_dir, local_md_dir = f"{output_dir}/images", output_dir
    image_writer, md_writer = FileBasedDataWriter(local_image_dir), FileBasedDataWriter(local_md_dir)
    reader = FileBasedDataReader()
    pdf_bytes = reader.read(origin_file_path)
    ds = PymuDocDataset(pdf_bytes)
    if ds.classify() == SupportedPdfParseMethod.OCR:
        infer_result = ds.apply(doc_analyze, ocr=True)
        pipe_result = infer_result.pipe_ocr_mode(image_writer)
    else:
        infer_result = ds.apply(doc_analyze, ocr=False)
        pipe_result = infer_result.pipe_txt_mode(image_writer)
    pipe_result.dump_md(md_writer, md_file_name, local_image_dir)

# API 方式

def generate_checksum(uid: str, seed: str, content: str) -> str:
    # 拼接字符串
    data = f"{uid}{seed}{content}"
    # 创建 SHA256 哈希对象
    sha256_hash = hashlib.sha256()
    # 更新哈希对象内容
    sha256_hash.update(data.encode('utf-8'))
    # 返回十六进制格式的哈希值
    return sha256_hash.hexdigest()

def create_transform_task(origin_file_url: str, seed: str):
    url='https://mineru.net/api/v4/extract/task'
    header = {
        'Content-Type': 'application/json',
        "Authorization": f"Bearer {os.environ.get('MINERU_API_TOKEN')}"
    }
    data = {
        'url': origin_file_url,
        'is_ocr': True,
        # TODO 区分dev和prod
        'callback': f'{api_base_url}/callback/mineru/extract',
        'seed': seed
    }

    res = requests.post(url=url,
                        headers=header,
                        json=data)
    return res.json()

def get_remote_mineru_task_status(task_id: str):
    url = f'https://mineru.net/api/v4/extract/task/{task_id}'
    header = {
        'Content-Type': 'application/json',
        "Authorization": f"Bearer {os.environ.get('MINERU_API_TOKEN')}"
    }

    res = requests.get(url, headers=header)
    return res.json()

def verify_callback(back_checksum: str, seed: str, content: any):
    computed_checksum = generate_checksum(uid=uid, 
                                          seed=seed,
                                          content=content)
    if back_checksum == computed_checksum:
        return True
    else:
        return False
    
if __name__ == '__main__':
    transform_local_file(origin_file_path='/Users/kinda/Downloads/LCM-LoRA-Technical-Report.pdf')