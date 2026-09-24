import React, { useEffect, useState } from 'react';
import { crisisAPI } from '../services/api';

const CrisisPage: React.FC = () => {
  const [hotlineInfo, setHotlineInfo] = useState<any>(null);

  useEffect(() => {
    const fetchHotline = async () => {
      try {
        const response = await crisisAPI.getHotline();
        setHotlineInfo(response.data);
      } catch (error) {
        console.error('获取危机热线失败:', error);
      }
    };
    fetchHotline();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 mb-8 text-center">
          <div className="text-6xl mb-4">🆘</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            如果你正在经历危机
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            请记住，你不是一个人。无论你正在经历什么，都有专业的人愿意帮助你。
          </p>
          
          {hotlineInfo && (
            <div className="bg-white rounded-lg p-6 inline-block shadow-md">
              <p className="text-sm text-gray-500 mb-2">24小时心理援助热线</p>
              <p className="text-4xl font-bold text-red-600 mb-2">
                {hotlineInfo.hotline}
              </p>
              <p className="text-sm text-gray-500">
                备用热线：{hotlineInfo.backupHotline}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⚠️ 紧急情况下怎么办？</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-red-50 rounded-lg">
              <div className="text-3xl flex-shrink-0">🚨</div>
              <div>
                <h3 className="font-semibold text-red-700 mb-1">如果有即时的自伤危险</h3>
                <p className="text-gray-600">
                  请立即拨打 <strong>110</strong> 或 <strong>120</strong>，
                  或前往最近医院的急诊科。
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl flex-shrink-0">📞</div>
              <div>
                <h3 className="font-semibold text-yellow-700 mb-1">拨打心理援助热线</h3>
                <p className="text-gray-600">
                  全国有很多免费的24小时心理援助热线，专业的心理咨询师会倾听你的诉说。
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl flex-shrink-0">👨‍👩‍👧‍👦</div>
              <div>
                <h3 className="font-semibold text-blue-700 mb-1">告诉信任的人</h3>
                <p className="text-gray-600">
                  如果你身边有信任的家人或朋友，请告诉他们你的感受，他们会愿意支持你。
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-green-50 rounded-lg">
              <div className="text-3xl flex-shrink-0">🏥</div>
              <div>
                <h3 className="font-semibold text-green-700 mb-1">寻求专业医疗帮助</h3>
                <p className="text-gray-600">
                  可以去当地精神卫生中心或综合医院的心理科就诊，寻求专业的诊断和治疗。
                </p>
              </div>
            </div>
          </div>
        </div>

        {hotlineInfo && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 全国心理援助热线</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {hotlineInfo.resources?.map((resource: string, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{resource}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">💡 你可以尝试的自助方法</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-3">🧘</div>
              <h3 className="font-semibold mb-2">深呼吸放松</h3>
              <p className="text-sm text-gray-600">
                试着深呼吸：吸气4秒，屏息4秒，呼气6秒，重复几次。
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-4xl mb-3">✍️</div>
              <h3 className="font-semibold mb-2">写下感受</h3>
              <p className="text-sm text-gray-600">
                把当下的感受写下来，这本身就是一种宣泄和释放。
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-4xl mb-3">🚶</div>
              <h3 className="font-semibold mb-2">出去走走</h3>
              <p className="text-sm text-gray-600">
                离开当前环境，去户外散散步，呼吸新鲜空气。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p className="text-lg">请记住：</p>
          <p className="text-2xl font-bold text-primary-600 mt-2">
            黑夜无论怎样悠长，白昼总会到来。
          </p>
          <p className="mt-4">—— 莎士比亚</p>
        </div>
      </div>
    </div>
  );
};

export default CrisisPage;
