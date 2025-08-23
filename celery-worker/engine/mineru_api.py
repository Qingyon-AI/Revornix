import uuid
import httpx
import hashlib
from pathlib import Path
from config.base import BASE_DIR
from protocol.engine import EngineProtocol, WebsiteInfo, FileInfo
from playwright.async_api import async_playwright

class MineruApiEngine(EngineProtocol):

    def __init__(self):
        super().__init__(engine_uuid='d90eabd6ce9e42da98ba6168cb189b70',
                         engine_name='MinerU API',
                         engine_name_zh='MinerU API',
                         engine_description='MinerU API is an AI-driven file parser provided by MinerU official, which can parse files such as webpages, PDFs, and images into Markdown format while retaining the original layout well.',
                         engine_description_zh='MinerU API 是 MinerU官方提供的AI驱动的文件解析器，可以将网页、PDF、图片等文件解析为 Markdown 格式并且较好地保留原来的排版。')
        
    
    def _generate_checksum(self, uid: str, seed: str, content: str) -> str:
        # 拼接字符串
        data = f"{uid}{seed}{content}"
        # 创建 SHA256 哈希对象
        sha256_hash = hashlib.sha256()
        # 更新哈希对象内容
        sha256_hash.update(data.encode('utf-8'))
        # 返回十六进制格式的哈希值
        return sha256_hash.hexdigest()
    
    async def _get_batch_status(self, batch_id: str):
        token = self.get_engine_config().get('token')
        url = f"https://mineru.net/api/v4/extract-results/batch/{batch_id}"
        header = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        res = httpx.get(url, headers=header)
        return res.json()
    
    def _get_task_status(self, task_id: str):
        token = self.get_engine_config().get('token')
        url = f'https://mineru.net/api/v4/extract/task/{task_id}'
        header = {
            'Content-Type': 'application/json',
            "Authorization": f"Bearer {token}"
        }

        res = httpx.get(url, headers=header)
        return res.json()

    def _verify_callback(self, back_checksum: str, seed: str, content: any):
        uid = self.get_engine_config().get('uid')
        computed_checksum = self._generate_checksum(uid=uid, 
                                                    seed=seed,
                                                    content=content)
        if back_checksum == computed_checksum:
            return True
        else:
            return False
        
    async def analyse_website(self, 
                              url: str):
        token = self.get_engine_config().get('token')
        temp_dir_name = f'{uuid.uuid4()}'
        temp_shot_pdf_path = BASE_DIR / 'temp' / temp_dir_name / f'scene-snap.pdf'
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url)
            await page.pdf(path=temp_shot_pdf_path)
            await browser.close()
        url = "https://mineru.net/api/v4/file-urls/batch"
        header = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        file_name = Path(temp_shot_pdf_path).name
        data = {
            "enable_formula": True,
            "language": "ch",
            "enable_table": True,
            "files": [
                {"name":file_name, "is_ocr": True, "data_id": "abcd"}
            ]
        }
        file_paths = [temp_shot_pdf_path]
        response = httpx.post(url,
                              headers=header,
                              json=data)
        if response.status_code == 200:
            result = response.json()
            if result["code"] == 0:
                batch_id = result["data"]["batch_id"]
                urls = result["data"]["file_urls"]
                for i in range(0, len(urls)):
                    with open(file_paths[i], 'rb') as f:
                        res_upload = httpx.put(urls[i], data=f)
                        if res_upload.status_code == 200:
                            print(f"{urls[i]} upload success")
                        else:
                            print(f"{urls[i]} upload failed")
            else:
                raise Exception(f'apply upload url failed, reason:{result.msg}')
        else:
            raise Exception(f'response not success. status: {response.status_code}, result: {response}')
    
    async def analyse_file(self,
                           file_path: str):
        token = self.get_engine_config().get('token')
        url = "https://mineru.net/api/v4/file-urls/batch"
        header = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        file_name = Path(file_path).name
        data = {
            "enable_formula": True,
            "language": "ch",
            "enable_table": True,
            "files": [
                {"name":file_name, "is_ocr": True, "data_id": "abcd"}
            ]
        }
        file_paths = [file_path]
        response = httpx.post(url,
                              headers=header,
                              json=data)
        if response.status_code == 200:
            result = response.json()
            if result["code"] == 0:
                batch_id = result["data"]["batch_id"]
                urls = result["data"]["file_urls"]
                for i in range(0, len(urls)):
                    with open(file_paths[i], 'rb') as f:
                        res_upload = httpx.put(urls[i], data=f)
                        if res_upload.status_code == 200:
                            print(f"{urls[i]} upload success")
                        else:
                            print(f"{urls[i]} upload failed")
            else:
                raise Exception(f'apply upload url failed, reason:{result.msg}')
        else:
            raise Exception(f'response not success. status: {response.status_code}, result: {response}')