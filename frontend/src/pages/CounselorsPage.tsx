import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { counselorAPI, postAPI } from '../services/api';
import { Tag } from '../types';
import { useAuth } from '../context/AuthContext';

const CounselorsPage: React.FC = () => {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const { user } = useAuth();

  const [applyData, setApplyData] = useState({
    realName: '',
    certificateNumber: '',
    certificateImage: '',
    expertise: [] as string[],
    introduction: '',
    hourlyRate: 200
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [counselorsRes, tagsRes] = await Promise.all([
          counselorAPI.getApproved(selectedTag ? { tagId: selectedTag } : undefined),
          postAPI.getTags()
        ]);
        setCounselors(counselorsRes.data);
        setTags(tagsRes.data);
      } catch (error) {
        console.error('获取咨询师列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTag]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await counselorAPI.apply(applyData);
      alert('申请已提交，等待审核！');
      setShowApplyModal(false);
    } catch (error: any) {
      alert(error.response?.data?.error || '申请失败');
    }
  };

  const toggleExpertise = (tag: string) => {
    setApplyData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(tag)
        ? prev.expertise.filter(t => t !== tag)
        : [...prev.expertise, tag]
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">专业咨询师</h1>
          <p className="text-gray-600">选择适合你的咨询师，获取专业帮助</p>
        </div>
        {user && user.role === 'USER' && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="btn-primary"
          >
            申请成为咨询师
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-2 rounded-full font-medium transition-colors ${
            !selectedTag
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(tag.id)}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              selectedTag === tag.id
                ? 'text-white'
                : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: selectedTag === tag.id ? tag.color : `${tag.color}20`,
              color: selectedTag === tag.id ? 'white' : tag.color
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {counselors.map(counselor => (
          <div
            key={counselor.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl">
                👨‍⚕️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {counselor.user.nickname || counselor.user.username}
                </h3>
                <p className="text-primary-600">认证咨询师</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {counselor.expertise?.slice(0, 3).map((tag: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {counselor.introduction || '暂无简介'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-lg font-bold text-primary-600">
                ¥{counselor.hourlyRate}/小时
              </span>
              <Link
                to={`/counselors/${counselor.id}`}
                className="btn-primary text-sm"
              >
                查看详情
              </Link>
            </div>
          </div>
        ))}
      </div>

      {counselors.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">👨‍⚕️</div>
          <p className="text-lg">暂无咨询师</p>
        </div>
      )}

      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">申请成为咨询师</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  真实姓名 *
                </label>
                <input
                  type="text"
                  value={applyData.realName}
                  onChange={e => setApplyData({ ...applyData, realName: e.target.value })}
                  className="input-field"
                  placeholder="请输入真实姓名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  咨询师证书编号 *
                </label>
                <input
                  type="text"
                  value={applyData.certificateNumber}
                  onChange={e => setApplyData({ ...applyData, certificateNumber: e.target.value })}
                  className="input-field"
                  placeholder="请输入证书编号"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  证书图片URL *
                </label>
                <input
                  type="text"
                  value={applyData.certificateImage}
                  onChange={e => setApplyData({ ...applyData, certificateImage: e.target.value })}
                  className="input-field"
                  placeholder="请上传证书图片后粘贴URL"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  擅长领域 *
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleExpertise(tag.name)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        applyData.expertise.includes(tag.name)
                          ? 'text-white'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: applyData.expertise.includes(tag.name) ? tag.color : `${tag.color}20`,
                        color: applyData.expertise.includes(tag.name) ? 'white' : tag.color
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  个人简介
                </label>
                <textarea
                  value={applyData.introduction}
                  onChange={e => setApplyData({ ...applyData, introduction: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder="介绍一下你的专业背景和咨询经验..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  咨询费用（元/小时）*
                </label>
                <input
                  type="number"
                  value={applyData.hourlyRate}
                  onChange={e => setApplyData({ ...applyData, hourlyRate: Number(e.target.value) })}
                  className="input-field"
                  min="0"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  提交申请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounselorsPage;
