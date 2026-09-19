import json

from aiohttp import web
import aiohttp

base_url = "http://127.0.0.1:8000"

async def chat_completion_handler(request):
    try:
        data = await request.read()
        payload = json.loads(data)
        async with aiohttp.ClientSession() as session:
            if "messages" in payload:
                target_url = f"{base_url}/v1/chat/completions"
            else:
                target_url = f"{base_url}/v1/completions"
            async with session.request(
                method=request.method,
                url=target_url,
                headers=request.headers,
                data=data,
                params=request.query
            ) as target_response:
                # 创建响应对象，使用目标响应的状态码
                response = web.StreamResponse(
                    status=target_response.status,
                    headers=target_response.headers
                )

                # 准备响应
                await response.prepare(request)

                # 流式传输响应体
                async for chunk in target_response.content.iter_any():
                    await response.write(chunk)

                await response.write_eof()
                return response

    except aiohttp.ClientError as e:
        return web.Response(
            status=502,
            text=f"Proxy Error: {str(e)}"
        )

async def health_check_handler(request):
    target_url = f"{base_url}/health"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=request.method,
                url=target_url,
                headers=request.headers,
                params=request.query
            ) as response:
                body = await response.read()

                # 返回响应
                return web.Response(
                    body=body,
                    status=response.status,
                    headers=response.headers
                )

    except aiohttp.ClientError as e:
        return web.Response(
            status=502,
            text=f"Proxy Error: {str(e)}"
        )


app = web.Application()
app.router.add_route('post', '/invocations', chat_completion_handler)
app.router.add_route('post', '/v1/chat/completions', chat_completion_handler)
app.router.add_route('post', '/v1/completions', chat_completion_handler)
app.router.add_route('get', '/ping', health_check_handler)
app.router.add_route('get', '/health', health_check_handler)


if __name__ == '__main__':
    print("Proxy server started at http://127.0.0.1:8080")
    web.run_app(app, port=8080)
