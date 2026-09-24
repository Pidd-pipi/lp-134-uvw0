import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupAPI } from '../services/api';
import { SupportGroup, GroupMessage } from '../types';
import { useAuth } from '../context/AuthContext';

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<SupportGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isMember, setIsMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await groupAPI.getGroup(id!);
        setGroup(response.data);
        if (user) {
          setIsMember(response.data.members?.some((m: any) => m.userId === user.id) || false);
        }
      } catch (error) {
        console.error('获取小组详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages]);

  const handleJoinGroup = async () => {
    try {
      await groupAPI.joinGroup(id!);
      const response = await groupAPI.getGroup(id!);
      setGroup(response.data);
      setIsMember(true);
      alert('加入小组成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '加入失败');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await groupAPI.sendMessage(id!, { content: newMessage });
      setNewMessage('');
      const response = await groupAPI.getGroup(id!);
      setGroup(response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '发送失败');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">小组不存在</div>
        <Link to="/groups" className="text-primary-600 hover:underline mt-4 inline-block">
          返回小组列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/groups" className="text-primary-600 hover:underline mb-6 inline-block">
        ← 返回小组列表
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                group.status === 'FULL' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {group.status === 'ACTIVE' ? '招募中' :
                 group.status === 'FULL' ? '已满员' : '已关闭'}
              </span>
            </div>

            <p className="text-gray-600 mb-4">{group.description}</p>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                主题：{group.topic}
              </span>
              {group.meetingTime && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                  {group.meetingTime}
                </span>
              )}
              {group.meetingFrequency && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  {group.meetingFrequency}
                </span>
              )}
            </div>

            {user && !isMember && group.status === 'ACTIVE' && (
              <button
                onClick={handleJoinGroup}
                className="btn-primary mt-6"
              >
                加入小组
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">小组交流</h2>
            </div>

            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {group.messages?.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  还没有消息，快来发表第一条消息吧！
                </div>
              ) : (
                group.messages?.map((message: GroupMessage) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      user && message.userId === user.id ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                      👤
                    </div>
                    <div className={`max-w-[70%] ${
                      user && message.userId === user.id ? 'text-right' : ''
                    }`}>
                      <p className="text-sm text-gray-500 mb-1">
                        {message.user.nickname || message.user.username}
                        <span className="ml-2 text-xs">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <div className={`inline-block p-3 rounded-lg ${
                        user && message.userId === user.id
                          ? 'bg-primary-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {isMember && (
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 input-field"
                    placeholder="输入消息..."
                  />
                  <button type="submit" className="btn-primary">
                    发送
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              小组成员 ({group.members?.length || 0}/{group.maxMembers})
            </h3>
            <div className="space-y-3">
              {group.members?.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {member.user.nickname || member.user.username}
                    </p>
                    {member.role === 'leader' && (
                      <span className="text-xs text-primary-600">组长</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage;
