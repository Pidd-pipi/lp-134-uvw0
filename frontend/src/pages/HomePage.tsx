import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postAPI, groupAPI } from '../services/api';
import { Post, Tag, SupportGroup } from '../types';

const HomePage: React.FC = () => {
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<SupportGroup[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, tagsRes, groupsRes] = await Promise.all([
          postAPI.getPosts({ limit: 5 }),
          postAPI.getTags(),
          groupAPI.getGroups({ limit: 4 })
        ]);
        setRecentPosts(postsRes.data.posts || postsRes.data);
        setTags(tagsRes.data);
        setGroups(groupsRes.data.groups || groupsRes.data);
      } catch (error) {
        console.error('获取首页数据失败:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            在这里，你不是一个人
          </h1>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            心灵驿站是一个温暖的心理健康互助平台，你可以匿名倾诉困扰，
            获取专业咨询师的建议，加入互助小组，共同成长。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/posts"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              开始倾诉
            </Link>
            <Link
              to="/counselors"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors"
            >
              寻找咨询师
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">匿名倾诉</h3>
            <p className="text-gray-600">选择匿名身份，安全地分享你的困扰和心声</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <div className="text-4xl mb-4">👨‍⚕️</div>
            <h3 className="text-xl font-semibold mb-2">专业咨询</h3>
            <p className="text-gray-600">持证咨询师为你提供专业的心理建议和指导</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">互助小组</h3>
            <p className="text-gray-600">加入志同道合的伙伴，互相支持共同成长</p>
          </div>
        </div>

        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">热门标签</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <Link
                key={tag.id}
                to={`/posts?tagId=${tag.id}`}
                className="px-4 py-2 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">最新倾诉</h2>
              <Link to="/posts" className="text-primary-600 hover:text-primary-700">
                查看更多 →
              </Link>
            </div>
            <div className="space-y-4">
              {recentPosts.slice(0, 4).map(post => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-800 mb-2">{post.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{post.displayName}</span>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>👁 {post.viewCount}</span>
                      <span>💬 {post.replyCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">互助小组</h2>
              <Link to="/groups" className="text-primary-600 hover:text-primary-700">
                查看更多 →
              </Link>
            </div>
            <div className="space-y-4">
              {groups.map(group => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-800 mb-2">{group.name}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{group.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      成员: {group.members?.length || 0}/{group.maxMembers}
                    </span>
                    <span className="text-sm text-primary-600">{group.topic}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 bg-red-50 p-8 rounded-xl text-center">
          <div className="text-4xl mb-4">🆘</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">需要紧急帮助？</h2>
          <p className="text-gray-600 mb-4">
            如果你正在经历严重的心理困扰或有自伤想法，请立即寻求专业帮助
          </p>
          <Link
            to="/crisis"
            className="inline-block bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            查看危机援助热线
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
