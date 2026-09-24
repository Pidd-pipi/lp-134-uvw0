import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@mentalhealth.com',
      passwordHash: hashedPassword,
      nickname: '系统管理员',
      anonymousName: '温暖的阳光',
      role: 'ADMIN'
    }
  });

  console.log('管理员账号创建成功:', admin.username);

  const tags = [
    { name: '焦虑', color: '#f59e0b', description: '关于焦虑情绪的分享与讨论' },
    { name: '抑郁', color: '#6366f1', description: '关于抑郁情绪的分享与讨论' },
    { name: '人际关系', color: '#10b981', description: '人际关系困扰与处理' },
    { name: '工作压力', color: '#ef4444', description: '职场压力与工作倦怠' },
    { name: '学业压力', color: '#8b5cf6', description: '学习压力与考试焦虑' },
    { name: '家庭关系', color: '#ec4899', description: '家庭矛盾与亲子关系' },
    { name: '情感问题', color: '#f43f5e', description: '恋爱与情感困扰' },
    { name: '自我成长', color: '#14b8a6', description: '个人成长与自我提升' },
    { name: '睡眠问题', color: '#0ea5e9', description: '失眠与睡眠质量改善' },
    { name: '创伤修复', color: '#a855f7', description: '心理创伤的疗愈与修复' }
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: tag,
      create: tag
    });
  }

  console.log('标签创建完成');

  const testUserPassword = await bcrypt.hash('user123456', 10);

  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'testuser@mentalhealth.com',
      passwordHash: testUserPassword,
      nickname: '测试用户',
      anonymousName: '迷路的星星',
      role: 'USER'
    }
  });

  console.log('测试用户创建成功:', testUser.username);

  const counselorPassword = await bcrypt.hash('counselor123', 10);

  const testCounselor = await prisma.user.upsert({
    where: { username: 'testcounselor' },
    update: {},
    create: {
      username: 'testcounselor',
      email: 'counselor@mentalhealth.com',
      passwordHash: counselorPassword,
      nickname: '李咨询师',
      anonymousName: '温暖的陪伴',
      role: 'COUNSELOR'
    }
  });

  const counselorProfile = await prisma.counselorProfile.upsert({
    where: { userId: testCounselor.id },
    update: {},
    create: {
      userId: testCounselor.id,
      realName: '李明',
      certificateNumber: 'CERT2024001',
      certificateImage: '/certificates/cert001.jpg',
      expertise: ['焦虑', '抑郁', '人际关系'],
      introduction: '国家二级心理咨询师，擅长焦虑抑郁情绪调节、人际关系咨询。拥有10年临床经验。',
      hourlyRate: 300,
      status: 'APPROVED'
    }
  });

  console.log('测试咨询师创建成功:', testCounselor.username);

  const groupTags = await prisma.tag.findMany({
    where: { name: { in: ['焦虑', '自我成长'] } }
  });

  const testGroup = await prisma.supportGroup.upsert({
    where: { id: 'test-group-001' },
    update: {},
    create: {
      id: 'test-group-001',
      name: '焦虑情绪互助小组',
      description: '一个专门为受焦虑困扰的朋友们提供的互助空间，我们一起面对，共同成长。',
      topic: '焦虑',
      maxMembers: 5,
      minMembers: 3,
      meetingTime: '每周三晚8点',
      meetingFrequency: '每周一次',
      createdBy: testUser.id,
      status: 'ACTIVE'
    }
  });

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: testGroup.id,
        userId: testUser.id
      }
    },
    update: {},
    create: {
      groupId: testGroup.id,
      userId: testUser.id,
      role: 'leader'
    }
  });

  console.log('测试小组创建成功:', testGroup.name);

  console.log('所有种子数据已创建完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
