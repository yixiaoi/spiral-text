import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Download, Type, Image as ImageIcon, RotateCw, AlignLeft, AlignRight, RefreshCw, Circle, Palette, X, Check, Square, Triangle, Hexagon, Move, Maximize2, RefreshCcw, Star, ImagePlus, Scaling } from 'lucide-react';

const SpiralTextGenerator = () => {
  // --- 状态管理 ---
  const [text, setText] = useState("Life is a spiral, keep moving forward. ");
  const [fontSize, setFontSize] = useState(24);
  const [letterSpacing, setLetterSpacing] = useState(2); 
  const [spiralGap, setSpiralGap] = useState(40); 
  const [startRadius, setStartRadius] = useState(60); 
  const [isClockwise, setIsClockwise] = useState(true); 
  const [isInwardText, setIsInwardText] = useState(false); 
  const [isRTL, setIsRTL] = useState(false); 
  const [centerImage, setCenterImage] = useState(null); 
  
  // 背景图相关状态
  const [backgroundImage, setBackgroundImage] = useState(null); 
  const [backgroundOpacity, setBackgroundOpacity] = useState(1); 

  // 画布与颜色
  const [canvasSize, setCanvasSize] = useState(1000); // 默认增大到 1000
  const [textColor, setTextColor] = useState("#000000"); 
  const [spiralShape, setSpiralShape] = useState('circle'); 

  // 变换参数
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 }); 
  const [stretch, setStretch] = useState({ x: 1, y: 1 }); 
  const [rotationAngle, setRotationAngle] = useState(0); 

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
  const [downloadFormat, setDownloadFormat] = useState('png'); 
  const [downloadQuality, setDownloadQuality] = useState(1); // 默认 1x 即可，因为画布本身可以设很大
  const [downloadTransparent, setDownloadTransparent] = useState(true);
  const [downloadWithBackground, setDownloadWithBackground] = useState(true);

  // --- 拖拽交互状态 ---
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); 
  const lastMousePos = useRef({ x: 0, y: 0 });

  // --- 辅助函数：获取形状半径缩放 ---
  const getShapeScale = (angle, shapeType) => {
    if (shapeType === 'circle') return 1;

    let sides = 4;
    if (shapeType === 'triangle') sides = 3;
    if (shapeType === 'pentagon') sides = 5;

    const segmentAngle = (2 * Math.PI) / sides;
    let normalizedAngle = angle;
    if (normalizedAngle < 0) normalizedAngle = Math.abs(normalizedAngle); 

    const rAngle = (normalizedAngle % segmentAngle) - (segmentAngle / 2);
    const cosVal = Math.cos(rAngle);
    if (cosVal < 0.001) return 10; 
    return 1 / cosVal;
  };

  const handleImageUpload = (e, isBackground = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isBackground) {
            setBackgroundImage(event.target.result);
        } else {
            setCenterImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadImage = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });
  };

  // --- 核心绘制逻辑 ---
  const drawScene = useCallback((ctx, width, height, centerImgObj, bgImgObj, isTransparentBackground, isExporting = false, includeBg = true) => {
    ctx.clearRect(0, 0, width, height);
    
    // 如果不是透明背景，绘制白色底色
    // 在预览模式下，为了让用户看到边界，我们可以不画全白，而是依赖 CSS 的透明网格
    // 但如果有背景图且不透明，需要画底色防止穿透
    if (!isTransparentBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 绘制背景图片
    if (bgImgObj && includeBg) {
        ctx.save();
        ctx.globalAlpha = backgroundOpacity;
        const scale = Math.max(width / bgImgObj.width, height / bgImgObj.height);
        const x = (width - bgImgObj.width * scale) / 2;
        const y = (height - bgImgObj.height * scale) / 2;
        ctx.drawImage(bgImgObj, x, y, bgImgObj.width * scale, bgImgObj.height * scale);
        ctx.restore();
    }

    const baseCx = width / 2;
    const baseCy = height / 2;
    const cx = baseCx + centerOffset.x;
    const cy = baseCy + centerOffset.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationAngle); 

    // 绘制中心图片
    const clipRadius = Math.max(0, startRadius - 10); 
    if (centerImgObj) {
      ctx.save();
      ctx.scale(stretch.x, stretch.y);
      ctx.beginPath();
      ctx.arc(0, 0, clipRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip(); 
      
      const scale = Math.max(clipRadius * 2 / centerImgObj.width, clipRadius * 2 / centerImgObj.height);
      const imgX = - (centerImgObj.width / 2) * scale;
      const imgY = - (centerImgObj.height / 2) * scale;
      ctx.drawImage(centerImgObj, imgX, imgY, centerImgObj.width * scale, centerImgObj.height * scale);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
    }

    // 绘制螺旋文字
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    let chars = Array.from(text);
    let baseAngleOffset = -Math.PI / 2; 
    if (spiralShape === 'square') baseAngleOffset = -Math.PI / 4;

    let angle = baseAngleOffset;
    if (!isClockwise) angle = baseAngleOffset + Math.PI;

    let baseRadius = startRadius;
    const b = spiralGap / (2 * Math.PI);

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const charWidth = ctx.measureText(char).width;
      
      const shapeScale = getShapeScale(angle, spiralShape);
      const currentRealRadius = baseRadius * shapeScale;

      const safeRadius = Math.max(currentRealRadius, 1);
      const minStretch = Math.min(stretch.x, stretch.y);
      
      let thetaDiff = (charWidth + letterSpacing) / (safeRadius * (minStretch > 0 ? minStretch : 1));

      const rawX = currentRealRadius * Math.cos(angle);
      const rawY = currentRealRadius * Math.sin(angle);
      
      const x = rawX * stretch.x;
      const y = rawY * stretch.y;

      const lookAheadAngle = angle + (isClockwise ? 0.05 : -0.05);
      const nextBaseRadius = baseRadius + b * (isClockwise ? 0.05 : -0.05);
      const nextShapeScale = getShapeScale(lookAheadAngle, spiralShape);
      const nextRealRadius = nextBaseRadius * nextShapeScale;
      
      const nextRawX = nextRealRadius * Math.cos(lookAheadAngle);
      const nextRawY = nextRealRadius * Math.sin(lookAheadAngle);

      const nextX = nextRawX * stretch.x;
      const nextY = nextRawY * stretch.y;
      
      let charRotation = Math.atan2(nextY - y, nextX - x);
      
      if (!isClockwise) charRotation += Math.PI;
      if (isInwardText) charRotation += Math.PI;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(charRotation);
      ctx.fillText(char, 0, 0);
      ctx.restore();

      if (isClockwise) {
        angle += thetaDiff;
        baseRadius += b * thetaDiff; 
      } else {
        angle -= thetaDiff;
        baseRadius += b * thetaDiff; 
      }
    }

    if (!isExporting) {
       drawControls(ctx);
    }

    ctx.restore();

  }, [text, fontSize, letterSpacing, spiralGap, startRadius, isClockwise, isInwardText, isRTL, textColor, fontFamily, spiralShape, centerOffset, stretch, rotationAngle, backgroundOpacity]);

  // --- 绘制控制手柄 ---
  const drawControls = (ctx) => {
    const handleSize = 12; 
    const guideColor = '#3b82f6'; 

    ctx.save();
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const guideRadius = Math.max(startRadius, 50) + 20; 
    
    ctx.beginPath();
    if (spiralShape === 'circle') {
        ctx.ellipse(0, 0, guideRadius * stretch.x, guideRadius * stretch.y, 0, 0, Math.PI * 2);
    } else {
        const w = guideRadius * stretch.x;
        const h = guideRadius * stretch.y;
        ctx.rect(-w, -h, w * 2, h * 2);
    }
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = guideColor;
    ctx.lineWidth = 3; 

    // Center
    ctx.beginPath();
    ctx.arc(0, 0, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
    ctx.moveTo(0, -6); ctx.lineTo(0, 6);
    ctx.stroke();

    // Right
    const handleX = guideRadius * stretch.x;
    ctx.beginPath();
    ctx.arc(handleX, 0, handleSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = guideColor;
    ctx.font = '14px sans-serif'; 
    ctx.fillText('↔', handleX - 7, 22);

    // Bottom
    const handleY = guideRadius * stretch.y;
    ctx.beginPath();
    ctx.arc(0, handleY, handleSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = guideColor;
    ctx.fillText('↕', 12, handleY + 5);

    // Rotate
    const rotHandleY = - (guideRadius * stretch.y + 50); 
    ctx.beginPath();
    ctx.moveTo(0, - (guideRadius * stretch.y)); 
    ctx.lineTo(0, rotHandleY);
    ctx.strokeStyle = guideColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, rotHandleY, handleSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = guideColor;
    ctx.fillText('↻', -5, rotHandleY + 5);

    ctx.restore();
  };

  // --- 交互事件 ---
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleX 
    };
  };

  const toLocalSpace = (screenX, screenY) => {
    const width = canvasSize;
    const height = canvasSize;
    const baseCx = width / 2;
    const baseCy = height / 2;
    const cx = baseCx + centerOffset.x;
    const cy = baseCy + centerOffset.y;

    const dx = screenX - cx;
    const dy = screenY - cy;

    const cos = Math.cos(-rotationAngle);
    const sin = Math.sin(-rotationAngle);
    
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return { x: localX, y: localY, cx, cy }; 
  };

  const hitTest = (screenX, screenY, scaleFactor) => {
    const { x, y } = toLocalSpace(screenX, screenY);
    const guideRadius = Math.max(startRadius, 50) + 20; 
    const minTouchTarget = 40; 
    const handleHitRadius = Math.max(25, minTouchTarget * (scaleFactor || 1) * 0.5);

    if (Math.hypot(x, y) < handleHitRadius) return 'center';
    const hx = guideRadius * stretch.x;
    if (Math.hypot(x - hx, y) < handleHitRadius) return 'stretchX';
    const hy = guideRadius * stretch.y;
    if (Math.hypot(x, y - hy) < handleHitRadius) return 'stretchY';
    const rotY = - (guideRadius * stretch.y + 50); 
    if (Math.hypot(x, y - rotY) < handleHitRadius) return 'rotate';

    return null;
  };

  const handlePointerDown = (e) => {
    const pos = getCanvasPoint(e);
    const target = hitTest(pos.x, pos.y, pos.scaleX);
    if (target) {
      setIsDragging(target);
      lastMousePos.current = pos;
      e.preventDefault(); 
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const pos = getCanvasPoint(e);
    
    const dx = pos.x - lastMousePos.current.x;
    const dy = pos.y - lastMousePos.current.y;
    const localPos = toLocalSpace(pos.x, pos.y);
    const guideRadius = Math.max(startRadius, 50) + 20; 

    if (isDragging === 'center') {
      setCenterOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDragging === 'stretchX') {
      const newScaleX = Math.max(0.2, localPos.x / guideRadius);
      setStretch(prev => ({ ...prev, x: newScaleX }));
    } else if (isDragging === 'stretchY') {
      const newScaleY = Math.max(0.2, localPos.y / guideRadius);
      setStretch(prev => ({ ...prev, y: newScaleY }));
    } else if (isDragging === 'rotate') {
       const relX = pos.x - localPos.cx;
       const relY = pos.y - localPos.cy;
       const newAngle = Math.atan2(relY, relX) + Math.PI / 2;
       setRotationAngle(newAngle);
    }

    lastMousePos.current = pos;
    e.preventDefault();
  };

  const handlePointerUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = async () => {
        let centerImgObj = null;
        let bgImgObj = null;
        if (centerImage) centerImgObj = await loadImage(centerImage);
        if (backgroundImage) bgImgObj = await loadImage(backgroundImage);
        drawScene(ctx, canvas.width, canvas.height, centerImgObj, bgImgObj, false, false, true);
    };
    render();
  }, [drawScene, centerImage, backgroundImage, canvasSize, backgroundOpacity]);

  const executeDownload = async () => {
    const tempCanvas = document.createElement('canvas');
    const scaleFactor = downloadQuality;
    const logicalSize = canvasSize;
    
    tempCanvas.width = logicalSize * scaleFactor;
    tempCanvas.height = logicalSize * scaleFactor;
    
    const ctx = tempCanvas.getContext('2d');
    ctx.scale(scaleFactor, scaleFactor);

    let centerImgObj = null;
    let bgImgObj = null;
    if (centerImage) centerImgObj = await loadImage(centerImage);
    if (backgroundImage) bgImgObj = await loadImage(backgroundImage);

    const isActuallyTransparent = downloadFormat === 'png' && downloadTransparent;
    drawScene(ctx, logicalSize, logicalSize, centerImgObj, bgImgObj, isActuallyTransparent, true, downloadWithBackground);

    const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = tempCanvas.toDataURL(mimeType, 0.9);
    const link = document.createElement('a');
    link.download = `spiral-text-${spiralShape}-${Date.now()}.${downloadFormat}`;
    link.href = dataUrl;
    link.click();
    setShowDownloadModal(false);
  };

  // 形状选择组件
  const ShapeSelector = () => (
    <div className="grid grid-cols-4 gap-2">
      {[
        { id: 'circle', icon: Circle, label: '圆形' },
        { id: 'triangle', icon: Triangle, label: '三角形' },
        { id: 'square', icon: Square, label: '方形' },
        { id: 'pentagon', icon: Hexagon, label: '五边形' },
      ].map((shape) => (
        <button
          key={shape.id}
          onClick={() => {
            setSpiralShape(shape.id);
            setStretch({ x: 1, y: 1 });
            setCenterOffset({ x: 0, y: 0 }); 
            setRotationAngle(0); 
          }}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
            spiralShape === shape.id 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' 
              : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
          }`}
          title={shape.label}
        >
          <shape.icon size={20} className={shape.id === 'triangle' ? 'fill-current' : ''} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-screen w-full bg-gray-50 font-sans text-gray-800 relative overflow-hidden flex flex-col">
      
      {/* 主布局容器 */}
      <div className="flex flex-col-reverse md:flex-row h-full w-full">

        {/* 左侧(桌面)/底部(手机)：控制面板 */}
        <div className="flex-1 w-full md:w-1/3 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg z-10 md:border-r border-gray-200 h-full overflow-y-auto">
          
          {/* 移动端顶部标题栏 */}
          <div className="md:hidden bg-white px-6 py-4 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-600" /> 
              <h1 className="text-lg font-bold text-gray-800">螺旋生成器</h1>
            </div>
            <button 
              onClick={() => setShowDownloadModal(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
            >
              <Download size={18} />
            </button>
          </div>

          <div className="p-6">
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

              {/* 2. 形状选择 */}
              <div className="space-y-2">
                 <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">螺旋形状</label>
                 <ShapeSelector />
                 <p className="text-xs text-gray-400 mt-2">💡 提示：你可以直接在画布上拖拽蓝色圆点来调整形状和位置。</p>
                 <div className="flex gap-4 text-xs text-indigo-600 mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><Move size={12}/> 拖拽中心移动</span>
                    <span className="flex items-center gap-1"><Maximize2 size={12}/> 拖拽边缘拉伸</span>
                    <span className="flex items-center gap-1"><RefreshCcw size={12}/> 拖拽顶部旋转</span>
                 </div>
              </div>

              <hr className="border-gray-100" />

              {/* 3. 核心参数滑块 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">外观参数</h3>
                
                {/* 画布尺寸 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>画布尺寸 (Resolution)</span>
                    <span>{canvasSize} x {canvasSize} px</span>
                  </div>
                  <input
                    type="range" min="500" max="4000" step="100"
                    value={canvasSize}
                    onChange={(e) => setCanvasSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

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
                    type="range" min="10" max="300"
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
                    type="range" min="-10" max="100"
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
                    type="range" min="20" max="500"
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
                    type="range" min="0" max="1000"
                    value={startRadius}
                    onChange={(e) => setStartRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 4. 样式开关 */}
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

              {/* 5. 图片管理 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">图片设置</h3>
                
                {/* 中心图案 */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                      <ImageIcon className="w-4 h-4" /> 中心图案
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-white border border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition whitespace-nowrap shadow-sm">
                        上传中心图
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                      </label>
                      {centerImage && (
                        <button 
                          onClick={() => setCenterImage(null)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X size={12} /> 清除
                        </button>
                      )}
                    </div>
                </div>

                {/* 背景图片 */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                      <ImagePlus className="w-4 h-4" /> 背景图片
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-white border border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition whitespace-nowrap shadow-sm">
                        上传背景图
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                      </label>
                      {backgroundImage && (
                        <button 
                          onClick={() => setBackgroundImage(null)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X size={12} /> 清除
                        </button>
                      )}
                    </div>
                    {/* 背景透明度滑块 */}
                    {backgroundImage && (
                        <div className="space-y-1 mt-2">
                            <div className="flex justify-between text-xs">
                                <span>背景透明度</span>
                                <span>{Math.round(backgroundOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={backgroundOpacity}
                                onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    )}
                </div>
              </div>

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
        <div className="h-[50vh] md:h-full md:flex-1 bg-gray-200 flex items-center justify-center p-0 overflow-hidden relative shrink-0 z-0">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
          </div>
          
          {/* 移除卡片样式，使用纯净画布，并增加灰色边框提示边缘 */}
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="max-h-full max-w-full w-auto h-auto object-contain cursor-move touch-none border border-gray-300 shadow-sm"
            // 注意：不再使用 rounded-xl，完全直角
            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', touchAction: 'none' }}
            // 添加交互事件
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            // 添加 Touch 事件支持，确保移动端兼容性
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          <div className="hidden md:block absolute bottom-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs text-gray-500 pointer-events-none">
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
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 block">倍率 (Scale Factor)</label>
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
                      {q}x {q === 1 ? '(原始)' : q === 2 ? '(2倍)' : '(4倍)'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400">最终尺寸 = 画布尺寸 x 倍率</p>
              </div>

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
                    disabled={downloadFormat === 'jpeg'} 
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

               {/* 新增：背景图融合选项 (仅当有背景图时显示) */}
               {backgroundImage && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                   <label className="text-sm font-semibold text-gray-700 block">融合选项</label>
                   <button
                    onClick={() => setDownloadWithBackground(!downloadWithBackground)}
                    className={`w-full py-2 px-3 rounded-lg border text-sm flex items-center justify-between transition-all ${
                       downloadWithBackground ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <span>包含背景图片</span>
                    {downloadWithBackground && <Check size={16} />}
                  </button>
                  <p className="text-[10px] text-gray-400">如果不选中，仅保存螺旋文字和中心图案。</p>
                </div>
               )}

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