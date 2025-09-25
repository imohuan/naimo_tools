# 搜索 https://api.github.com/search/repositories?q=vue
# q：必需参数，用于指定搜索关键词和限定条件。例如，github octocat in:readme user:defunkt表示搜索用户 “defunkt” 的仓库中，README 文件里包含 “github” 和 “octocat” 的内容。
# sort：可选参数，用于指定排序方式。不同的搜索端点有不同的可选值，如搜索仓库时可选stars、forks、updated，搜索提交时可选author - date、committer - date等。
# order：可选参数，当指定了sort参数时，用于指定升序（asc）或降序（desc），默认为desc。
# https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path_to_file}
# https://raw.githubusercontent.com/vuejs/vue/0.12-csp/package.json
import requests


def direct_download_github_branch(user, repo, branch, output_file, token=None):
    # 直接构造ZIP下载链接
    zip_url = f"https://github.com/{user}/{repo}/archive/refs/heads/{branch}.zip"

    # 设置请求头，私有仓库需要认证
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"

    try:
        print(f"正在下载 {branch} 分支...")
        with requests.get(zip_url, headers=headers, stream=True) as r:
            r.raise_for_status()
            with open(output_file, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        print(f"下载完成，保存为: {output_file}")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP错误: {e}")
    except Exception as e:
        print(f"发生错误: {e}")


# 使用示例
if __name__ == "__main__":
    GITHUB_USER = "vuejs"
    GITHUB_REPO = "vue"
    BRANCH_NAME = "0.12-csp"
    OUTPUT_FILE = "vue-0.12-csp.zip"
    # 私有仓库需要填写令牌，公共仓库可以留空
    GITHUB_TOKEN = ""  # 可选: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

    direct_download_github_branch(
        GITHUB_USER, GITHUB_REPO, BRANCH_NAME, OUTPUT_FILE, GITHUB_TOKEN)
