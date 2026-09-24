import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postAPI } from '../services/api';
import { Post, Tag } from '../types';
import { useAuth } from '../context/AuthContext';

const PostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    isAnonymous: true,
    tagIds: [] as string[]
  });
  const { user } = useAuth();

  const selectedTagId = searchParams.get('tagId');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, tagsRes] = await Promise.all([
          postAPI.getPosts({ tagId: selectedTagId || undefined }),
          postAPI.getTags()
        ]);
        setPosts(postsRes.data.posts || postsRes.data);
        setTags(tagsRes.data);
      } catch (error) {
        console.error('获取帖子列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTagId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await postAPI.createPost(newPost);
      if (response.data.crisisAlert) {
        alert(response.data.crisisAlert.message + '\n\n危机热线: ' + response.data.crisisAlert.hotline);
      }
      setShowCreateModal(false);
      setNewPost({ title: '', content: '', isAnonymous: true, tagIds: [] });
      const postsRes = await postAPI.getPosts({ tagId: selectedTagId || undefined });
      setPosts(postsRes.data.posts || postsRes.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '发布失败');
    }
  };

  const toggleTag = (tagId: string) => {
    setNewPost(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">倾诉广场</h1>
          <p className="text-gray-600">在这里，你可以安全地倾诉内心的困扰</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            发布新帖
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSearchParams({})}
          className={`px-4 py-2 rounded-full font-medium transition-colors ${
            !selectedTagId
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSearchParams({ tagId: tag.id })}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              selectedTagId === tag.id
                ? 'text-white'
                : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: selectedTagId === tag.id ? tag.color : `${tag.color}20`,
              color: selectedTagId === tag.id ? 'white' : tag.color
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/posts/${post.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
              {post.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {post.content}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags?.slice(0, 3).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span className="flex items-center gap-1">
                {post.isAnonymous ? '🎭' : '👤'} {post.displayName}
              </span>
              <div className="flex gap-4">
                <span>👁 {post.viewCount}</span>
                <span>💬 {post.replyCount}</span>
                <span>❤️ {post.likeCount}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-lg">还没有帖子，快来发布第一篇吧！</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">发布新帖</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题 *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  className="input-field"
                  placeholder="请输入标题"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容 *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  className="input-field min-h-[150px]"
                  placeholder="写下你想说的话..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        newPost.tagIds.includes(tag.id)
                          ? 'text-white'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: newPost.tagIds.includes(tag.id) ? tag.color : `${tag.color}20`,
                        color: newPost.tagIds.includes(tag.id) ? 'white' : tag.color
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={newPost.isAnonymous}
                  onChange={e => setNewPost({ ...newPost, isAnonymous: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isAnonymous" className="text-sm text-gray-700">
                  匿名发布（使用随机昵称：{user?.anonymousName || '匿名用户'}）
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  发布
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsPage;
