# 自定义一个错误类型
class CustomException(Exception):
    def __init__(self, message, code: int = None):
        super().__init__(message)  # 调用基类的构造函数
        self.code = code  # 可以自定义额外的属性

    def __str__(self):
        return f"Error {self.code}: {self.args[0]}"  # 格式化错误信息