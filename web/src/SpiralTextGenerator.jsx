import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Download, Type, Image as ImageIcon, RotateCw, AlignLeft, AlignRight, RefreshCw, Circle, Palette, X, Check } from 'lucide-react';
import './index.css';

const SpiralTextGenerator = () => {
  // --- 状态管理 ---
  const [text, setText] = useState("Life is a spiral, keep moving forward. ");
  const [fontSize, setFontSize] = useState(24);
  const [letterSpacing, setLetterSpacing] = useState(2); // 字与字之间的距离
  const [spiralGap, setSpiralGap] = useState(40); // 螺旋线之间的间距 (疏密)
  const [startRadius, setStartRadius] = useState(60); // 起始圆的半径
  const [isClockwise, setIsClockwise] = useState(true); // 螺旋方向
  const [isInwardText, setIsInwardText] = useState(false); // 文字朝向（字头朝内还是朝外）
  const [isRTL, setIsRTL] = useState(false); // 是否是从右向左书写 (希伯来语/阿拉伯语)
  const [centerImage, setCenterImage] = useState(null); // 中心图片 URL
  const [canvasSize, setCanvasSize] = useState(800); // 基础画布大小
  const [textColor, setTextColor] = useState("#000000"); // 文字颜色
  
  // 字体列表
  const fontOptions = [
    { name: "无衬线 (默认)", value: '"Noto Sans", "Arial", sans-serif' },
    { name: "衬线体 (Serif)", value: '"Times New Roman", "Georgia", serif' },
    { name: "等宽字体 (Mono)", value: '"Courier New", "Courier", monospace' },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Impact (粗体)", value: "Impact, sans-serif" },
    { name: "Comic Sans (手写风)", value: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
    { name: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  ];
  const [fontFamily, setFontFamily] = useState(fontOptions[0].value);

  // --- 下载弹窗状态 ---
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('png'); // 'png' | 'jpeg'
  const [downloadQuality, setDownloadQuality] = useState(2); // 1, 2, 4
  const [downloadTransparent, setDownloadTransparent] = useState(true);

  const canvasRef = useRef(null);

  // --- 图片上传处理 ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCenterImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 核心绘制逻辑 (抽离出来以便复用) ---
  const drawScene = useCallback((ctx, width, height, loadedImg, isTransparentBackground) => {
    // 1. 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 2. 设置背景
    if (!isTransparentBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // 绘制中心图片
    if (loadedImg) {
      ctx.save();
      ctx.beginPath();
      const clipRadius = Math.max(0, startRadius - 10); 
      ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      const scale = Math.max(clipRadius * 2 / loadedImg.width, clipRadius * 2 / loadedImg.height);
      const x = centerX - (loadedImg.width / 2) * scale;
      const y = centerY - (loadedImg.height / 2) * scale;
      ctx.drawImage(loadedImg, x, y, loadedImg.width * scale, loadedImg.height * scale);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
    }

    // 绘制螺旋文字
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    let chars = Array.from(text);
    let angle = 0;
    if (!isClockwise) angle = Math.PI;

    let radius = startRadius;
    const b = spiralGap / (2 * Math.PI);

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const charWidth = ctx.measureText(char).width;
      const arcLength = charWidth + letterSpacing;
      const thetaDiff = arcLength / radius;

      if (isClockwise) {
        angle += thetaDiff;
      } else {
        angle -= thetaDiff;
      }

      radius += b * thetaDiff; 

      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      ctx.save();
      ctx.translate(x, y);
      
      let rotation = angle + Math.PI / 2;
      if (!isClockwise) rotation = angle - Math.PI / 2;
      if (isInwardText) rotation += Math.PI; 

      ctx.rotate(rotation);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
    ctx.restore();

  }, [text, fontSize, letterSpacing, spiralGap, startRadius, isClockwise, isInwardText, isRTL, textColor, fontFamily]);


  // --- 实时预览的 Effect ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 加载图片 (如果存在)
    if (centerImage) {
      const img = new Image();
      img.src = centerImage;
      img.onload = () => {
        drawScene(ctx, canvas.width, canvas.height, img, false); // false = 白底
      };
      if (img.complete) {
        drawScene(ctx, canvas.width, canvas.height, img, false);
      }
    } else {
      drawScene(ctx, canvas.width, canvas.height, null, false);
    }
  }, [drawScene, centerImage, canvasSize]);


  // --- 执行下载 ---
  const executeDownload = async () => {
    const tempCanvas = document.createElement('canvas');
    const scaleFactor = downloadQuality; // 1, 2, 4
    const logicalSize = canvasSize;
    
    tempCanvas.width = logicalSize * scaleFactor;
    tempCanvas.height = logicalSize * scaleFactor;
    
    const ctx = tempCanvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);

    let imgObj = null;
    if (centerImage) {
      imgObj = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = centerImage;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    }

    const isActuallyTransparent = downloadFormat === 'png' && downloadTransparent;
    drawScene(ctx, logicalSize, logicalSize, imgObj, isActuallyTransparent);

    const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = tempCanvas.toDataURL(mimeType, 0.9);
    
    const link = document.createElement('a');
    link.download = `spiral-text-${Date.now()}.${downloadFormat}`;
    link.href = dataUrl;
    link.click();
    
    setShowDownloadModal(false);
  };

  return (
    // 修改 1: 外层容器 h-screen overflow-hidden 锁定全屏不滚动
    <div className="h-screen w-full bg-gray-50 font-sans text-gray-800 relative overflow-hidden flex flex-col">
      
      {/* 主布局容器 */}
      {/* 修改 2: flex-col-reverse 让 Child 2 (Preview) 在视觉顶部 */}
      <div className="flex flex-col-reverse md:flex-row h-full w-full">

        {/* 左侧(桌面)/底部(手机)：控制面板 */}
        {/* 修改 3: flex-1 和 overflow-y-auto 确保只有这部分可以滚动 */}
        <div className="flex-1 w-full md:w-1/3 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg z-10 md:border-r border-gray-200 h-full overflow-y-auto">
          
          {/* 移动端顶部标题栏 (现在作为控制面板的第一部分) */}
          <div className="md:hidden bg-white px-6 py-4 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-600" /> 
              <h1 className="text-lg font-bold text-gray-800">螺旋生成器</h1>
            </div>
            {/* 可以在这里放下载按钮的简化版 */}
            <button 
              onClick={() => setShowDownloadModal(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
            >
              <Download size={18} />
            </button>
          </div>

          <div className="p-6">
            {/* 桌面端标题 (Mobile 隐藏) */}
            <h1 className="hidden md:flex text-2xl font-bold mb-6 items-center gap-2 text-indigo-600">
              <RefreshCw className="w-6 h-6" /> 螺旋生成器
            </h1>

            <div className="space-y-6 pb-20 md:pb-0">
              
              {/* 1. 文本输入 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Type className="w-4 h-4" /> 输入文字
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="在这里输入文字..."
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => setIsRTL(!isRTL)}
                    className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${isRTL ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {isRTL ? <AlignRight size={14}/> : <AlignLeft size={14}/>}
                    {isRTL ? "RTL模式 (希伯来语)" : "LTR模式 (英语/中文)"}
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 2. 核心参数滑块 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">外观参数</h3>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>字体 (Font)</span>
                  </div>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {fontOptions.map((font) => (
                      <option key={font.name} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>文字颜色</span>
                    <span>{textColor}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-300 shadow-sm cursor-pointer shrink-0">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 p-2 border rounded-lg text-sm uppercase font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-0"
                      maxLength={7}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>字体大小 (Size)</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="100"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>字间距 (Spacing)</span>
                    <span>{letterSpacing}px</span>
                  </div>
                  <input
                    type="range" min="-5" max="50"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>螺旋疏密 (Gap)</span>
                    <span>{spiralGap}</span>
                  </div>
                  <input
                    type="range" min="20" max="200"
                    value={spiralGap}
                    onChange={(e) => setSpiralGap(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>中心半径 (Radius)</span>
                    <span>{startRadius}px</span>
                  </div>
                  <input
                    type="range" min="0" max="300"
                    value={startRadius}
                    onChange={(e) => setStartRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 3. 样式开关 */}
              <div className="grid grid-cols-2 gap-4">
                 <button
                  onClick={() => setIsClockwise(!isClockwise)}
                  className="p-3 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
                >
                  <RotateCw className={`w-5 h-5 ${!isClockwise && "scale-x-[-1]"}`} />
                  <span className="text-xs font-medium">{isClockwise ? "顺时针" : "逆时针"}</span>
                </button>

                <button
                  onClick={() => setIsInwardText(!isInwardText)}
                  className="p-3 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition"
                >
                  <div className="text-sm font-bold border border-black rounded px-1">A</div>
                  <span className="text-xs font-medium">{isInwardText ? "字头朝内" : "字头朝外"}</span>
                </button>
              </div>

              <hr className="border-gray-100" />

              {/* 4. 中心图片 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> 中心图案
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition whitespace-nowrap">
                    上传图片
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {centerImage && (
                    <button 
                      onClick={() => setCenterImage(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 下载按钮 (Desktop or Bottom of list) */}
              <button
                onClick={() => setShowDownloadModal(true)}
                className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 transition transform active:scale-95"
              >
                <Download className="w-5 h-5" /> 下载生成的螺旋图
              </button>

            </div>
          </div>
        </div>

        {/* 右侧(桌面)/顶部(手机)：预览画布 */}
        {/* 修改 4: Mobile固定高度 h-[40vh] 且不收缩 shrink-0, 这样它永远占据顶部 */}
        <div className="h-[40vh] md:h-full md:flex-1 bg-gray-200 flex items-center justify-center p-4 md:p-10 overflow-hidden relative shrink-0 z-0">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
          </div>
          
          <div className="relative shadow-2xl rounded-full overflow-hidden bg-white max-h-full max-w-full">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              // 保持 canvas 适应容器
              className="max-h-[35vh] md:max-h-[80vh] w-auto h-auto object-contain"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
            />
          </div>

          <div className="hidden md:block absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs text-gray-500">
             Canvas Size: {canvasSize}x{canvasSize}
          </div>
        </div>

      </div>

      {/* 模态框 (Modal) */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" /> 导出设置
              </h2>
              <button onClick={() => setShowDownloadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* 1. 清晰度选择 */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">清晰度 (Resolution)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 4].map((q) => (
                    <button
                      key={q}
                      onClick={() => setDownloadQuality(q)}
                      className={`py-2 px-1 md:px-3 rounded-lg border text-xs md:text-sm font-medium transition-all ${
                        downloadQuality === q 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {q}x {q === 1 ? '(标准)' : q === 2 ? '(高清)' : '(超清)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 格式与透明度 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-sm font-semibold text-gray-700 block">文件格式</label>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                     {['png', 'jpeg'].map(fmt => (
                       <button
                         key={fmt}
                         onClick={() => setDownloadFormat(fmt)}
                         className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${
                           downloadFormat === fmt ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                         }`}
                       >
                         {fmt}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">背景设置</label>
                  <button
                    disabled={downloadFormat === 'jpeg'} // JPEG 不支持透明
                    onClick={() => setDownloadTransparent(!downloadTransparent)}
                    className={`w-full py-2 px-3 rounded-lg border text-sm flex items-center justify-between transition-all ${
                       downloadFormat === 'jpeg' ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 
                       downloadTransparent ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <span>透明背景</span>
                    {downloadTransparent && downloadFormat !== 'jpeg' && <Check size={16} />}
                  </button>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition"
              >
                取消
              </button>
              <button 
                onClick={executeDownload}
                className="flex-[2] py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Download size={18} /> 确认
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SpiralTextGenerator;