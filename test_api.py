#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:3234"

def print_response(title, response):
    print(f"\n=== {title} ===")
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)}")
        return data
    except:
        print(f"Response: {response.text}")
        return None

print("=== 测试心理健康互助平台 API ===\n")

# 1. 测试健康检查
resp = requests.get(f"{BASE_URL}/health")
print_response("健康检查", resp)

# 2. 测试注册
print("\n1. 测试注册...")
register_data = {
    "username": "testuser003",
    "email": "testuser003@example.com",
    "password": "password123",
    "nickname": "测试用户003"
}
resp = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
data = print_response("注册", resp)
token = None
if data and 'token' in data:
    token = data['token']
    print(f"获取到Token: {token[:50]}...")

headers = {"Authorization": f"Bearer {token}"} if token else {}

# 3. 测试登录
print("\n2. 测试登录...")
login_data = {
    "username": "testuser003",
    "password": "password123"
}
resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
data = print_response("登录", resp)
if data and 'token' in data:
    token = data['token']
    headers = {"Authorization": f"Bearer {token}"}
    print(f"登录Token: {token[:50]}...")

# 4. 测试获取用户信息
print("\n3. 测试获取用户信息...")
resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
print_response("获取用户信息", resp)

# 5. 测试获取标签列表
print("\n4. 测试获取标签列表...")
resp = requests.get(f"{BASE_URL}/api/posts/tags")
tags_data = print_response("获取标签列表", resp)

# 6. 测试发帖
print("\n5. 测试发帖...")
tag_ids = []
if tags_data and isinstance(tags_data, list) and len(tags_data) > 0:
    tag_ids = [tags_data[0]['id']]

post_data = {
    "title": "测试帖子标题",
    "content": "这是一个测试帖子，我最近心情不太好，想寻求大家的帮助和建议。",
    "isAnonymous": True,
    "tagIds": tag_ids
}
resp = requests.post(f"{BASE_URL}/api/posts", json=post_data, headers=headers)
post_resp = print_response("发帖", resp)
post_id = None
if post_resp and 'data' in post_resp:
    post_id = post_resp['data'].get('id')
    print(f"帖子ID: {post_id}")

# 7. 测试获取帖子列表
print("\n6. 测试获取帖子列表...")
resp = requests.get(f"{BASE_URL}/api/posts?page=1&limit=5")
print_response("获取帖子列表", resp)

# 8. 测试获取帖子详情
if post_id:
    print(f"\n7. 测试获取帖子详情 (ID: {post_id})...")
    resp = requests.get(f"{BASE_URL}/api/posts/{post_id}")
    print_response("获取帖子详情", resp)

# 9. 测试获取咨询师列表
print("\n8. 测试获取咨询师列表...")
resp = requests.get(f"{BASE_URL}/api/counselors/approved")
print_response("获取咨询师列表", resp)

# 10. 测试创建互助小组
print("\n9. 测试创建互助小组...")
group_data = {
    "name": "焦虑互助小组",
    "description": "让我们一起面对焦虑，互相支持，共同成长",
    "maxMembers": 5,
    "topic": "焦虑",
    "meetingTime": "每周三晚上8点"
}
resp = requests.post(f"{BASE_URL}/api/groups", json=group_data, headers=headers)
group_resp = print_response("创建互助小组", resp)
group_id = None
if group_resp and 'data' in group_resp:
    group_id = group_resp['data'].get('id')
    print(f"小组ID: {group_id}")

# 11. 测试获取小组列表
print("\n10. 测试获取小组列表...")
resp = requests.get(f"{BASE_URL}/api/groups?page=1&limit=5")
print_response("获取小组列表", resp)

# 12. 测试加入小组
if group_id:
    print(f"\n11. 测试加入小组 (ID: {group_id})...")
    resp = requests.post(f"{BASE_URL}/api/groups/{group_id}/join", headers=headers)
    print_response("加入小组", resp)

# 13. 测试获取危机热线
print("\n12. 测试获取危机热线...")
resp = requests.get(f"{BASE_URL}/api/crisis/hotlines")
print_response("获取危机热线", resp)

# 14. 测试发帖触发危机预警
print("\n13. 测试发帖触发危机预警...")
crisis_post_data = {
    "title": "生活太累了",
    "content": "我想自杀，不想活了，真的太累了，感觉没有任何希望。",
    "isAnonymous": True,
    "tagIds": []
}
resp = requests.post(f"{BASE_URL}/api/posts", json=crisis_post_data, headers=headers)
print_response("发帖触发危机预警", resp)

# 15. 测试获取预约列表（需要登录）
print("\n14. 测试获取我的预约...")
resp = requests.get(f"{BASE_URL}/api/appointments/my", headers=headers)
print_response("获取我的预约", resp)

print("\n\n=== 所有测试完成！===")
