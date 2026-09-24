import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupAPI } from '../services/api';
import { SupportGroup, GroupMessage, GroupMember } from '../types';
import { useAuth } from '../context/AuthContext';

const LEADER_MIN_MEMBERSHIP_DAYS = 7;

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<SupportGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState('');
  const [transferring, setTransferring] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const fetchGroup = async () => {
    try {
      const response = await groupAPI.getGroup(id!);
      setGroup(response.data);
    } catch (error) {
      console.error('获取小组详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchGroup();
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages]);

  const myMembership = user
    ? group?.members?.find((m: GroupMember) => m.userId === user.id)
    : undefined;
  const isMember = !!myMembership;
  const isLeader = myMembership?.role === 'leader';
  const otherMembers = user
    ? group?.members?.filter((m: GroupMember) => m.userId !== user.id) || []
    : [];

  const isEligibleForLeader = (member: GroupMember) =>
    Date.now() - new Date(member.joinedAt).getTime() >=
    LEADER_MIN_MEMBERSHIP_DAYS * 24 * 60 * 60 * 1000;

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
    if (isLeader && otherMembers.length > 0) {
      alert('您是组长，请先将组长交接给入组满7天的成员，然后再退出小组');
      return;
    }
    const message =
      isLeader && otherMembers.length === 0
        ? '您是小组最后一名成员，退出后小组将关闭。确定退出吗？'
        : '退出后将无法查看群聊和打卡内容。确定退出小组吗？';
    if (!window.confirm(message)) return;

    try {
      const response = await groupAPI.leaveGroup(id!);
      alert(response.data?.message || '已退出小组');
      await fetchGroup();
    } catch (error: any) {
      alert(error.response?.data?.error || '退出失败');
    }
  };

  const handleTransfer = async () => {
    if (!selectedNewLeader || transferring) return;
    setTransferring(true);
    try {
      await groupAPI.transferLeadership(id!, { newLeaderId: selectedNewLeader });
      alert('组长交接成功！');
      setShowTransferModal(false);
      setSelectedNewLeader('');
      await fetchGroup();
    } catch (error: any) {
      alert(error.response?.data?.error || '交接失败');
    } finally {
      setTransferring(false);
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

            {isMember && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-3">
                  {isLeader && otherMembers.length > 0 && (
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="btn-secondary"
                    >
                      交接组长
                    </button>
                  )}
                  <button
                    onClick={handleLeaveGroup}
                    className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                  >
                    退出小组
                  </button>
                </div>
                {isLeader && otherMembers.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    您是组长，需先将组长交接给入组满7天的成员后才能退出小组
                  </p>
                )}
                {isLeader && otherMembers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    您是小组最后一名成员，退出后小组将关闭
                  </p>
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
              <div className="h-96 flex flex-col items-center justify-center text-gray-400 gap-2">
                <div className="text-4xl">🔒</div>
                <p>
                  {group.status === 'CLOSED'
                    ? '小组已关闭，群聊和打卡内容仅小组成员可见'
                    : '群聊和打卡内容仅小组成员可见'}
                </p>
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
              {group.members?.map((member: GroupMember) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {member.user.nickname || member.user.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className={member.role === 'leader' ? 'text-primary-600 font-medium' : ''}>
                        {member.role === 'leader' ? '组长' : '成员'}
                      </span>
                      <span className="ml-2">
                        {new Date(member.joinedAt).toLocaleDateString()} 加入
                      </span>
                    </p>
                  </div>
                </div>
              ))}
              {group.members?.length === 0 && (
                <p className="text-sm text-gray-400">暂无成员</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-2">交接组长</h2>
            <p className="text-sm text-gray-500 mb-4">
              请选择一名入组满7天的成员接任组长，交接后您将成为普通成员。
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {otherMembers.map((member: GroupMember) => {
                const eligible = isEligibleForLeader(member);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={!eligible}
                    onClick={() => setSelectedNewLeader(member.userId)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left ${
                      selectedNewLeader === member.userId
                        ? 'border-primary-500 bg-primary-50'
                        : eligible
                          ? 'border-gray-200 hover:border-primary-300'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${eligible ? 'text-gray-800' : 'text-gray-400'}`}>
                        {member.user.nickname || member.user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString()} 加入
                      </p>
                    </div>
                    {!eligible && (
                      <span className="text-xs text-gray-400">入组未满7天</span>
                    )}
                  </button>
                );
              })}
              {otherMembers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">暂无其他成员</p>
              )}
            </div>

            {otherMembers.length > 0 && !otherMembers.some(isEligibleForLeader) && (
              <p className="text-sm text-red-500 mt-3">
                暂无入组满7天的成员，暂时无法交接
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedNewLeader('');
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!selectedNewLeader || transferring}
                className="btn-primary disabled:opacity-50"
              >
                {transferring ? '交接中...' : '确认交接'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;
