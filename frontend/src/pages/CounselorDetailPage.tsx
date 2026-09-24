import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { counselorAPI, appointmentAPI } from '../services/api';
import { Schedule } from '../types';
import { useAuth } from '../context/AuthContext';

const CounselorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [counselor, setCounselor] = useState<any>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    title: '',
    description: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [counselorRes, schedulesRes] = await Promise.all([
          counselorAPI.getCounselor(id!),
          counselorAPI.getSchedules(id!)
        ]);
        setCounselor(counselorRes.data);
        setSchedules(schedulesRes.data);
      } catch (error) {
        console.error('获取咨询师详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      await appointmentAPI.create({
        scheduleId: selectedSchedule,
        ...bookingData
      });
      alert('预约成功！请等待咨询师确认。');
      setShowBookingModal(false);
      setBookingData({ title: '', description: '' });
      setSelectedSchedule(null);
      const schedulesRes = await counselorAPI.getSchedules(id!);
      setSchedules(schedulesRes.data);
    } catch (error: any) {
      alert(error.response?.data?.error || '预约失败');
    }
  };

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const date = new Date(schedule.date).toLocaleDateString('zh-CN');
    if (!acc[date]) acc[date] = [];
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!counselor) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-gray-500">咨询师不存在</div>
        <Link to="/counselors" className="text-primary-600 hover:underline mt-4 inline-block">
          返回咨询师列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/counselors" className="text-primary-600 hover:underline mb-6 inline-block">
        ← 返回咨询师列表
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center text-6xl mx-auto md:mx-0">
            👨‍⚕️
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {counselor.user.nickname || counselor.user.username}
            </h1>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
              {counselor.expertise?.map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-gray-600 mb-4">{counselor.introduction}</p>
            <div className="text-2xl font-bold text-primary-600">
              ¥{counselor.hourlyRate}/小时
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">可预约时间</h2>

        {Object.keys(groupedSchedules).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            该咨询师暂无可用排班时间
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSchedules).map(([date, daySchedules]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{date}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {daySchedules.map(schedule => (
                    <button
                      key={schedule.id}
                      onClick={() => {
                        if (!user) {
                          alert('请先登录');
                          return;
                        }
                        if (user.role === 'COUNSELOR') {
                          alert('咨询师无法预约咨询');
                          return;
                        }
                        setSelectedSchedule(schedule.id);
                        setShowBookingModal(true);
                      }}
                      disabled={!schedule.isAvailable}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        schedule.isAvailable
                          ? 'border-primary-200 hover:border-primary-500 hover:bg-primary-50'
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400'
                      }`}
                    >
                      <p className="font-medium">{schedule.startTime}</p>
                      <p className="text-sm text-gray-500">- {schedule.endTime}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">确认预约</h2>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  咨询主题 *
                </label>
                <input
                  type="text"
                  value={bookingData.title}
                  onChange={e => setBookingData({ ...bookingData, title: e.target.value })}
                  className="input-field"
                  placeholder="请输入咨询主题"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细描述
                </label>
                <textarea
                  value={bookingData.description}
                  onChange={e => setBookingData({ ...bookingData, description: e.target.value })}
                  className="input-field min-h-[100px]"
                  placeholder="简要描述你的问题或困扰..."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  咨询费用：<span className="font-bold text-primary-600">¥{counselor.hourlyRate}</span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  确认预约
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounselorDetailPage;
