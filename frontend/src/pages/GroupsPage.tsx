import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { groupAPI } from '../services/api';
import { SupportGroup } from '../types';
import { useAuth } from '../context/AuthContext';

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topic: '',
    maxMembers: 5,
    meetingTime: '',
    meetingFrequency: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await groupAPI.getGroups();
        setGroups(response.data.groups || response.data);
      } catch (error) {
        console.error('获取小组列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await groupAPI.createGroup(newGroup);
      setShowCreateModal(false);
      setNewGroup({
        name: '',
        description: '',
        topic: '',
        maxMembers: 5,
        meetingTime: '',
        meetingFrequency: ''
      });
      const response = await groupAPI.getGroups();
      setGroups(response.data.groups || response.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '创建失败');
    }
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">互助小组</h1>
          <p className="text-gray-600">加入互助小组，与同路人共同成长</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            创建小组
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <Link
            key={group.id}
            to={`/groups/${group.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                group.status === 'FULL' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {group.status === 'ACTIVE' ? '招募中' :
                 group.status === 'FULL' ? '已满员' : '已关闭'}
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {group.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {group.topic}
              </span>
              {group.meetingTime && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {group.meetingTime}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex -space-x-2">
                {group.members?.slice(0, 3).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center text-xs"
                  >
                    👤
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {group.members?.length || 0}/{group.maxMembers} 人
              </span>
            </div>
          </Link>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-lg">还没有小组，快来创建第一个吧！</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">创建互助小组</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小组名称 *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="input-field"
                  placeholder="请输入小组名称"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小组主题 *
                </label>
                <input
                  type="text"
                  value={newGroup.topic}
                  onChange={e => setNewGroup({ ...newGroup, topic: e.target.value })}
                  className="input-field"
                  placeholder="例如：焦虑、抑郁、人际关系等"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  小组描述 *
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder="描述小组的目的和愿景..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大成员数 *
                </label>
                <select
                  value={newGroup.maxMembers}
                  onChange={e => setNewGroup({ ...newGroup, maxMembers: Number(e.target.value) })}
                  className="input-field"
                >
                  <option value={3}>3人</option>
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    活动时间
                  </label>
                  <input
                    type="text"
                    value={newGroup.meetingTime}
                    onChange={e => setNewGroup({ ...newGroup, meetingTime: e.target.value })}
                    className="input-field"
                    placeholder="例如：每周三晚8点"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    活动频率
                  </label>
                  <input
                    type="text"
                    value={newGroup.meetingFrequency}
                    onChange={e => setNewGroup({ ...newGroup, meetingFrequency: e.target.value })}
                    className="input-field"
                    placeholder="例如：每周一次"
                  />
                </div>
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
                  创建小组
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
