import requests
import json
import time

BASE_URL = "http://localhost:3234/api"

def print_result(test_name, success, message=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"   {message}")

def test_registration_flow():
    print("\n=== 1. 注册发帖流程测试 ===")
    
    timestamp = str(int(time.time()))
    username = f"testuser_{timestamp}"
    email = f"{username}@test.com"
    password = "password123"
    
    # 注册
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            user_id = data.get("user", {}).get("id")
            print_result("用户注册", True, f"用户ID: {user_id}")
        else:
            print_result("用户注册", False, f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        print_result("用户注册", False, str(e))
        return None
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 登录 - 使用 username
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "username": username,
            "password": password
        })
        if response.status_code == 200:
            print_result("用户登录", True)
        else:
            print_result("用户登录", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        print_result("用户登录", False, str(e))
    
    # 获取标签 - 注意路径是 /api/posts/tags
    try:
        response = requests.get(f"{BASE_URL}/posts/tags")
        if response.status_code == 200:
            tags = response.json()
            tag_id = tags[0]["id"] if tags else None
            print_result("获取标签列表", True, f"找到 {len(tags)} 个标签")
        else:
            print_result("获取标签列表", False, f"状态码: {response.status_code}")
            tag_id = None
    except Exception as e:
        print_result("获取标签列表", False, str(e))
        tag_id = None
    
    # 发帖
    try:
        post_data = {
            "title": "测试帖子标题",
            "content": "这是一个测试帖子的内容，用来验证发帖功能是否正常工作。",
            "isAnonymous": False,
            "tagIds": [tag_id] if tag_id else []
        }
        response = requests.post(f"{BASE_URL}/posts", json=post_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            post = data.get("post", data)
            post_id = post.get("id")
            print_result("发布帖子", True, f"帖子ID: {post_id}")
        else:
            print_result("发布帖子", False, f"状态码: {response.status_code}, 响应: {response.text}")
            post_id = None
    except Exception as e:
        print_result("发布帖子", False, str(e))
        post_id = None
    
    # 获取帖子列表
    try:
        response = requests.get(f"{BASE_URL}/posts")
        if response.status_code == 200:
            data = response.json()
            posts = data.get("posts", [])
            print_result("获取帖子列表", True, f"共 {len(posts)} 个帖子")
        else:
            print_result("获取帖子列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取帖子列表", False, str(e))
    
    return {"token": token, "user_id": user_id, "post_id": post_id, "tag_id": tag_id}

def test_counselor_appointment_flow(context):
    print("\n=== 2. 咨询预约流程测试 ===")
    
    token = context["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取咨询师列表
    try:
        response = requests.get(f"{BASE_URL}/counselors/approved")
        if response.status_code == 200:
            counselors = response.json()
            if counselors:
                counselor = counselors[0]
                counselor_id = counselor["id"]
                print_result("获取咨询师列表", True, f"找到 {len(counselors)} 个咨询师")
            else:
                print_result("获取咨询师列表", True, "暂无咨询师（正常）")
                counselor_id = None
        else:
            print_result("获取咨询师列表", False, f"状态码: {response.status_code}")
            counselor_id = None
    except Exception as e:
        print_result("获取咨询师列表", False, str(e))
        counselor_id = None
    
    if counselor_id:
        # 获取咨询师详情
        try:
            response = requests.get(f"{BASE_URL}/counselors/{counselor_id}")
            if response.status_code == 200:
                data = response.json()
                schedules = data.get("schedules", [])
                print_result("获取咨询师详情", True, f"咨询师: {data.get('user', {}).get('nickname', '未知')}")
                schedule_id = schedules[0]["id"] if schedules else None
            else:
                print_result("获取咨询师详情", False, f"状态码: {response.status_code}")
                schedule_id = None
        except Exception as e:
            print_result("获取咨询师详情", False, str(e))
            schedule_id = None
        
        # 获取咨询师排班
        try:
            response = requests.get(f"{BASE_URL}/counselors/{counselor_id}/schedules")
            if response.status_code == 200:
                schedules = response.json()
                print_result("获取咨询师排班", True, f"找到 {len(schedules)} 个排班")
                schedule_id = schedules[0]["id"] if schedules else schedule_id
            else:
                print_result("获取咨询师排班", False, f"状态码: {response.status_code}")
        except Exception as e:
            print_result("获取咨询师排班", False, str(e))
    else:
        schedule_id = None
    
    # 获取我的预约 - 正确路径是 /api/appointments/my
    try:
        response = requests.get(f"{BASE_URL}/appointments/my", headers=headers)
        if response.status_code == 200:
            appointments = response.json()
            print_result("获取我的预约", True, f"共 {len(appointments)} 个预约")
        else:
            print_result("获取我的预约", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        print_result("获取我的预约", False, str(e))
    
    return context

def test_group_interaction_flow(context):
    print("\n=== 3. 小组互动流程测试 ===")
    
    token = context["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 创建小组
    try:
        group_data = {
            "name": "测试互助小组",
            "description": "这是一个测试用的互助小组",
            "topic": "心理健康",
            "maxMembers": 5,
            "minMembers": 3,
            "meetingTime": "每周三晚上8点",
            "meetingFrequency": "weekly"
        }
        response = requests.post(f"{BASE_URL}/groups", json=group_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            group = data.get("group", data)
            group_id = group.get("id")
            print_result("创建小组", True, f"小组ID: {group_id}")
        else:
            print_result("创建小组", False, f"状态码: {response.status_code}, 响应: {response.text}")
            group_id = None
    except Exception as e:
        print_result("创建小组", False, str(e))
        group_id = None
    
    # 获取小组列表
    try:
        response = requests.get(f"{BASE_URL}/groups")
        if response.status_code == 200:
            data = response.json()
            groups = data.get("groups", [])
            print_result("获取小组列表", True, f"共 {len(groups)} 个小组")
        else:
            print_result("获取小组列表", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取小组列表", False, str(e))
    
    if group_id:
        # 获取小组详情
        try:
            response = requests.get(f"{BASE_URL}/groups/{group_id}", headers=headers)
            if response.status_code == 200:
                group = response.json()
                print_result("获取小组详情", True, f"小组名称: {group.get('name')}")
            else:
                print_result("获取小组详情", False, f"状态码: {response.status_code}")
        except Exception as e:
            print_result("获取小组详情", False, str(e))
        
        # 发送小组消息
        try:
            message_data = {
                "content": "大家好，这是一条测试消息！"
            }
            response = requests.post(f"{BASE_URL}/groups/{group_id}/messages", 
                                    json=message_data, headers=headers)
            if response.status_code == 200:
                print_result("发送小组消息", True)
            else:
                print_result("发送小组消息", False, f"状态码: {response.status_code}")
        except Exception as e:
            print_result("发送小组消息", False, str(e))
        
        # 获取小组消息
        try:
            response = requests.get(f"{BASE_URL}/groups/{group_id}/messages", headers=headers)
            if response.status_code == 200:
                messages = response.json()
                print_result("获取小组消息", True, f"共 {len(messages)} 条消息")
            else:
                print_result("获取小组消息", False, f"状态码: {response.status_code}")
        except Exception as e:
            print_result("获取小组消息", False, str(e))
    
    # 获取我加入的小组 - 正确路径是 /api/groups/my
    try:
        response = requests.get(f"{BASE_URL}/groups/my", headers=headers)
        if response.status_code == 200:
            my_groups = response.json()
            print_result("获取我加入的小组", True, f"共加入 {len(my_groups)} 个小组")
        else:
            print_result("获取我加入的小组", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取我加入的小组", False, str(e))
    
    context["group_id"] = group_id
    return context

def test_crisis_alert_flow(context):
    print("\n=== 4. 危机预警流程测试 ===")
    
    token = context["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取危机热线
    try:
        response = requests.get(f"{BASE_URL}/crisis/hotline")
        if response.status_code == 200:
            hotline = response.json()
            print_result("获取危机热线", True, f"热线: {hotline.get('hotline', 'N/A')}")
        else:
            print_result("获取危机热线", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取危机热线", False, str(e))
    
    # 发布包含危机关键词的帖子
    try:
        post_data = {
            "title": "我感到很绝望",
            "content": "我不想活了，感觉生活没有意义，想要自杀。",
            "isAnonymous": True,
            "tagIds": [context["tag_id"]] if context.get("tag_id") else []
        }
        response = requests.post(f"{BASE_URL}/posts", json=post_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            post = data.get("post", data)
            crisis_post_id = post.get("id")
            crisis_detected = "crisisAlert" in data
            print_result("发布危机内容帖子", True, 
                        f"帖子ID: {crisis_post_id}, 危机检测: {'触发' if crisis_detected else '未触发'}")
        else:
            print_result("发布危机内容帖子", False, f"状态码: {response.status_code}, 响应: {response.text}")
            crisis_post_id = None
    except Exception as e:
        print_result("发布危机内容帖子", False, str(e))
        crisis_post_id = None
    
    # 管理员登录获取危机预警列表
    try:
        admin_login = requests.post(f"{BASE_URL}/auth/login", json={
            "username": "admin",
            "password": "admin123456"
        })
        if admin_login.status_code == 200:
            admin_data = admin_login.json()
            admin_token = admin_data.get("token")
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            print_result("管理员登录", True)
            
            # 获取危机预警列表
            response = requests.get(f"{BASE_URL}/crisis/alerts", headers=admin_headers)
            if response.status_code == 200:
                data = response.json()
                alerts = data.get("alerts", [])
                print_result("管理员获取危机预警列表", True, f"共 {len(alerts)} 条预警")
                
                if alerts:
                    alert_id = alerts[0]["id"]
                    
                    # 获取预警详情
                    response = requests.get(f"{BASE_URL}/crisis/alerts/{alert_id}", headers=admin_headers)
                    if response.status_code == 200:
                        alert_detail = response.json()
                        print_result("获取危机预警详情", True, 
                                    f"预警ID: {alert_id}, 关键词: {alert_detail.get('keyword')}")
                    else:
                        print_result("获取危机预警详情", False, f"状态码: {response.status_code}")
                    
                    # 处理预警
                    response = requests.post(f"{BASE_URL}/crisis/alerts/{alert_id}/resolve", 
                                           headers=admin_headers)
                    if response.status_code == 200:
                        print_result("处理危机预警", True)
                    else:
                        print_result("处理危机预警", False, f"状态码: {response.status_code}")
            else:
                print_result("管理员获取危机预警列表", False, f"状态码: {response.status_code}")
        else:
            print_result("管理员登录", False, f"状态码: {admin_login.status_code}, 响应: {admin_login.text}")
    except Exception as e:
        print_result("管理员危机预警流程", False, str(e))
    
    return context

def test_profile_flow(context):
    print("\n=== 5. 个人中心流程测试 ===")
    
    token = context["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 获取个人信息
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            user = response.json()
            print_result("获取个人信息", True, f"用户名: {user.get('username')}")
        else:
            print_result("获取个人信息", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取个人信息", False, str(e))
    
    # 获取我的帖子 - 正确路径是 /api/users/posts
    try:
        response = requests.get(f"{BASE_URL}/users/posts", headers=headers)
        if response.status_code == 200:
            posts = response.json()
            print_result("获取我的帖子", True, f"共 {len(posts)} 个帖子")
        else:
            print_result("获取我的帖子", False, f"状态码: {response.status_code}, 响应: {response.text}")
    except Exception as e:
        print_result("获取我的帖子", False, str(e))
    
    # 获取我的收藏 - 正确路径是 /api/users/favorites
    try:
        response = requests.get(f"{BASE_URL}/users/favorites", headers=headers)
        if response.status_code == 200:
            favorites = response.json()
            print_result("获取我的收藏", True, f"共 {len(favorites)} 个收藏")
        else:
            print_result("获取我的收藏", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取我的收藏", False, str(e))
    
    # 获取我的通知 - 正确路径是 /api/users/notifications
    try:
        response = requests.get(f"{BASE_URL}/users/notifications", headers=headers)
        if response.status_code == 200:
            notifications = response.json()
            print_result("获取我的通知", True, f"共 {len(notifications)} 条通知")
        else:
            print_result("获取我的通知", False, f"状态码: {response.status_code}")
    except Exception as e:
        print_result("获取我的通知", False, str(e))

if __name__ == "__main__":
    print("=" * 60)
    print("心理健康互助平台 - 完整流程测试")
    print("=" * 60)
    
    # 等待服务启动
    time.sleep(2)
    
    try:
        context = test_registration_flow()
        if context:
            test_counselor_appointment_flow(context)
            test_group_interaction_flow(context)
            test_crisis_alert_flow(context)
            test_profile_flow(context)
        
        print("\n" + "=" * 60)
        print("测试完成！")
        print("=" * 60)
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
