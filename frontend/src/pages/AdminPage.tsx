import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { counselorAPI, crisisAPI } from '../services/api';
import { CrisisAlert } from '../types';
import { useAuth } from '../context/AuthContext';

const AdminPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('counselors');
  const [pendingCounselors, setPendingCounselors] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const fetchData = async () => {
      try {
        const [counselorsRes, alertsRes] = await Promise.all([
          counselorAPI.getPending(),
          crisisAPI.getAlerts({ isResolved: false })
        ]);
        setPendingCounselors(counselorsRes.data);
        setAlerts(alertsRes.data.alerts || alertsRes.data);
      } catch (error) {
        console.error('获取管理数据失败:', error);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }

  const handleReviewCounselor = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const rejectionReason = status === 'REJECTED' 
      ? prompt('请输入拒绝原因（选填）') || undefined
      : undefined;

    try {
      await counselorAPI.reviewCounselor(id, { status, rejectionReason });
      alert('审核完成');
      const res = await counselorAPI.getPending();
      setPendingCounselors(res.data);
    } catch (error) {
      alert('审核失败');
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await crisisAPI.resolveAlert(id);
      alert('已标记为已处理');
      const res = await crisisAPI.getAlerts({ isResolved: false });
      setAlerts(res.data.alerts || res.data);
      setSelectedAlert(null);
    } catch (error) {
      alert('操作失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">管理后台</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('counselors')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'counselors'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              咨询师审核 ({pendingCounselors.length})
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              危机预警 ({alerts.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'counselors' && (
            <div className="space-y-4">
              {pendingCounselors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">✅</div>
                  <p>暂无待审核的咨询师申请</p>
                </div>
              ) : (
                pendingCounselors.map(counselor => (
                  <div key={counselor.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {counselor.user.nickname || counselor.user.username}
                        </h3>
                        <p className="text-sm text-gray-500">
                          真实姓名：{counselor.realName}
                        </p>
                        <p className="text-sm text-gray-500">
                          证书编号：{counselor.certificateNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          咨询费用：¥{counselor.hourlyRate}/小时
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewCounselor(counselor.id, 'APPROVED')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => handleReviewCounselor(counselor.id, 'REJECTED')}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {counselor.expertise?.map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {counselor.introduction && (
                      <p className="text-sm text-gray-600">{counselor.introduction}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      申请时间：{new Date(counselor.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">✅</div>
                    <p>暂无待处理的危机预警</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedAlert?.id === alert.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-red-500 text-xl">⚠️</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {alert.user.nickname || alert.user.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        检测到关键词：{alert.keyword}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div>
                {selectedAlert ? (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4">预警详情</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">用户</p>
                        <p className="font-medium">
                          {selectedAlert.user.nickname || selectedAlert.user.username}
                        </p>
                        <p className="text-sm text-gray-500">{selectedAlert.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">检测到的关键词</p>
                        <p className="font-medium text-red-600">{selectedAlert.keyword}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">内容摘要</p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded">
                          {selectedAlert.content}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">检测时间</p>
                        <p>{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(selectedAlert.id)}
                      className="w-full mt-6 btn-primary"
                    >
                      标记为已处理
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">👈</div>
                    <p>点击左侧查看预警详情</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
