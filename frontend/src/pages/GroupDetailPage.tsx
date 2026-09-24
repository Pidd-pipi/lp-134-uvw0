import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { groupAPI } from '../services/api';
import { SupportGroup, GroupMessage, GroupMember } from '../types';
import { useAuth } from '../context/AuthContext';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<SupportGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const fetchGroup = useCallback(async () => {
    try {
      const response = await groupAPI.getGroup(id!);
      setGroup(response.data);
    } catch (error) {
      console.error('获取小组详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages]);

  const handleJoinGroup = async () => {
    try {
      await groupAPI.joinGroup(id!);
      await fetchGroup();
      alert('加入小组成功！');
    } catch (error: any) {
      alert(error.response?.data?.error || '加入失败');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    const isLastMember = (group.members?.length || 0) <= 1;
    const confirmText = isLastMember
      ? '您是小组最后一名成员，退出后小组将关闭。确定退出吗？'
      : '退出后将无法查看群聊和打卡内容，确定退出吗？';
    if (!confirm(confirmText)) return;

    try {
      await groupAPI.leaveGroup(id!);
      alert('已退出小组');
      navigate('/groups');
    } catch (error: any) {
      alert(error.response?.data?.error || '退出失败');
    }
  };

  const handleTransfer = async (member: GroupMember) => {
    const name = member.user.nickname || member.user.username;
    if (!confirm(`确定要将组长交接给 ${name} 吗？交接后您将变为普通成员。`)) return;

    try {
      await groupAPI.transferLeadership(id!, member.userId);
      alert('交接成功');
      await fetchGroup();
    } catch (error: any) {
      alert(error.response?.data?.error || '交接失败');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await groupAPI.sendMessage(id!, { content: newMessage });
      setNewMessage('');
      await fetchGroup();
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

  const myMembership = user
    ? group.members?.find((m: GroupMember) => m.userId === user.id)
    : undefined;
  const isMember = !!myMembership;
  const isLeader = myMembership?.role === 'leader';

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

            {user && isMember && (
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  退出小组
                </button>
                {isLeader && (group.members?.length || 0) > 1 && (
                  <span className="text-sm text-gray-500">
                    组长需先在右侧成员列表中将组长交接给入组满7天的成员，才能退出
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">小组交流</h2>
            </div>

            {isMember ? (
              <>
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
              </>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500 px-6 text-center">
                {user
                  ? '加入小组后可查看群聊与打卡内容'
                  : '登录并加入小组后可查看群聊与打卡内容'}
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
              {group.members?.map((member: GroupMember) => {
                const canTakeOver =
                  Date.now() - new Date(member.joinedAt).getTime() >= SEVEN_DAYS_MS;
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">
                        {member.user.nickname || member.user.username}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          member.role === 'leader'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.role === 'leader' ? '组长' : '成员'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        入组时间：{new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {isLeader && member.userId !== user?.id && (
                      <button
                        onClick={() => handleTransfer(member)}
                        disabled={!canTakeOver}
                        title={canTakeOver ? '将组长交接给该成员' : '该成员入组未满7天，暂不能接任组长'}
                        className={`text-xs px-2 py-1 rounded border flex-shrink-0 ${
                          canTakeOver
                            ? 'border-primary-300 text-primary-600 hover:bg-primary-50'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        移交组长
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage;
