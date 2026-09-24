#!/bin/bash

echo "🚀 启动心理健康互助平台"

echo ""
echo "📦 检查并安装依赖..."

if [ ! -d "node_modules" ]; then
  npm install
fi

cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd ..

cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd ..

echo ""
echo "🗄️  启动数据库 (端口 5734)..."
docker-compose up -d postgres

echo ""
echo "⏳ 等待数据库启动..."
sleep 5

echo ""
echo "🔄 运行数据库迁移..."
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
cd ..

echo ""
echo "✅ 启动完成！"
echo ""
echo "📋 服务信息："
echo "   - 数据库端口: 5734"
echo "   - 后端端口: 3234"
echo "   - 前端端口: 8234"
echo ""
echo "📖 运行以下命令启动开发服务器："
echo "   npm run dev"
echo ""
echo "👤 测试账号："
echo "   管理员: admin / admin123456"
echo "   普通用户: testuser / user123456"
echo "   咨询师: testcounselor / counselor123"
