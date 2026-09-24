import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postAPI, userAPI } from '../services/api';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await postAPI.getPost(id!);
        setPost(response.data);
      } catch (error) {
        console.error('获取帖子详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      userAPI.getFavorites().then(res => {
        const favorites = res.data || [];
        setIsFavorited(favorites.some((f: any) => f.postId === id));
      });
    }
  }, [user, id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !id) return;

    try {
      await postAPI.createReply(id, { content: replyContent });
      setReplyContent('');
      const response = await postAPI.getPost(id);
      setPost(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '回复失败');
    }
  };

  const handleLike = async () => {
    if (!id) return;
    try {
      await postAPI.likePost(id);
      if (post) {
        setPost({ ...post, likeCount: post.likeCount + 1 });
      }
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleFavorite = async () => {
    if (!id) return;
    try {
      await userAPI.toggleFavorite(id);
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('收藏失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">帖子不存在</div>
        <Link to="/posts" className="text-primary-600 hover:underline mt-4 inline-block">
          返回帖子列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/posts" className="text-primary-600 hover:underline mb-6 inline-block">
        ← 返回帖子列表
      </Link>

      <article className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            {post.isAnonymous ? '🎭' : '👤'}
          </div>
          <div>
            <p className="font-medium text-gray-800">{post.displayName}</p>
            <p className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">{post.title}</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags?.map(({ tag }) => (
            <span
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-6">
          {post.content}
        </div>

        <div className="flex items-center gap-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-gray-500">
            <span>👁 {post.viewCount} 浏览</span>
          </div>
          <button
            onClick={handleLike}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            ❤️ {post.likeCount}
          </button>
          <div className="flex items-center gap-2 text-gray-500">
            💬 {post.replyCount} 回复
          </div>
          {user && (
            <button
              onClick={handleFavorite}
              className={`flex items-center gap-2 transition-colors ${
                isFavorited ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
              }`}
            >
              ⭐ {isFavorited ? '已收藏' : '收藏'}
            </button>
          )}
        </div>
      </article>

      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          回复 ({post.replies?.length || 0})
        </h2>

        {user && (
          <form onSubmit={handleReply} className="mb-6">
            <textarea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="input-field min-h-[100px] mb-3"
              placeholder="写下你的回复..."
            />
            <button type="submit" className="btn-primary">
              发表回复
            </button>
          </form>
        )}

        <div className="space-y-4">
          {post.replies?.map(reply => (
            <div key={reply.id} className="border-b pb-4 last:border-b-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  👤
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">
                    {reply.user.nickname || reply.user.username}
                  </p>
                  {reply.isCounselorReply && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      专业咨询师
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 ml-auto">
                  {new Date(reply.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-gray-700 pl-11">{reply.content}</p>
            </div>
          ))}
        </div>

        {(!post.replies || post.replies.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            暂无回复，快来发表第一条回复吧！
          </div>
        )}
      </section>
    </div>
  );
};

export default PostDetailPage;
