// OCR翻译插件主脚本
class OCRTranslator {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.settings = {};
    this.ocrResults = [];
    this.currentImage = null;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupCanvas();
    this.updateSettingsUI();

    // 监听自动截图事件
    if (window.ocrPluginAPI && window.ocrPluginAPI.onAutoScreenshot) {
      window.ocrPluginAPI.onAutoScreenshot(() => {
        setTimeout(() => this.takeScreenshot(), 500);
      });
    }
  }

  async loadSettings() {
    try {
      // 加载本地UI设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.loadSettings) {
        const localSettings = await window.ocrPluginAPI.loadSettings();
        if (localSettings) {
          this.settings = { ...this.settings, ...localSettings };
        }
      }

      // 加载全局API设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.getGlobalSettings) {
        const globalSettings = await window.ocrPluginAPI.getGlobalSettings();
        if (globalSettings) {
          this.settings.tencentSecretId = globalSettings.tencentSecretId || '';
          this.settings.tencentSecretKey = globalSettings.tencentSecretKey || '';
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }

    // 设置默认值
    this.settings = {
      tencentSecretId: '',
      tencentSecretKey: '',
      defaultSourceLang: 'auto',
      defaultTargetLang: 'zh',
      showOriginalImage: true,
      showOriginalText: true,
      showTranslatedText: true,
      originalTextColor: '#FF0000',
      translatedTextColor: '#0000FF',
      originalTextSize: 16,
      translatedTextSize: 16,
      originalTextBold: false,
      translatedTextBold: false,
      originalTextUnderline: false,
      translatedTextUnderline: false,
      originalTextWrap: true,
      originalTextOffsetX: 0,
      originalTextOffsetY: 0,
      translatedTextWrap: true,
      translatedTextOffsetX: 0,
      translatedTextOffsetY: 0,
      textBackgroundOpacity: 70,
      textBackgroundColor: '#000000',
      boxBorderColor: '#00FF00',
      boxBorderWidth: 2,
      ...this.settings
    };
  }

  async saveSettings() {
    try {
      // 保存本地UI设置
      if (window.ocrPluginAPI && window.ocrPluginAPI.saveSettings) {
        const localSettings = { ...this.settings };
        // 移除API密钥，这些应该保存到全局设置中
        delete localSettings.tencentSecretId;
        delete localSettings.tencentSecretKey;
        await window.ocrPluginAPI.saveSettings(localSettings);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  async updateAPIStatus() {
    try {
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');
      const apiStatus = document.getElementById('apiStatus');

      if (!statusIndicator || !statusText || !apiStatus) return;

      // 检查API密钥是否配置
      const hasSecretId = this.settings.tencentSecretId && this.settings.tencentSecretId.trim();
      const hasSecretKey = this.settings.tencentSecretKey && this.settings.tencentSecretKey.trim();

      if (hasSecretId && hasSecretKey) {
        statusIndicator.textContent = '🟢';
        statusText.textContent = '已配置';
        apiStatus.className = 'api-status configured';
      } else {
        statusIndicator.textContent = '🔴';
        statusText.textContent = '未配置';
        apiStatus.className = 'api-status error';
      }
    } catch (error) {
      console.error('更新API状态失败:', error);
    }
  }

  setupEventListeners() {
    // 控制栏按钮
    document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());
    document.getElementById('openImageBtn').addEventListener('click', () => this.openImage());
    document.getElementById('resetViewBtn').addEventListener('click', () => this.resetView());
    document.getElementById('saveImageBtn').addEventListener('click', () => this.saveImage());
    document.getElementById('copyTextBtn').addEventListener('click', () => this.copyText());
    document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

    // 设置面板
    document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());

    // 设置项监听
    this.setupSettingListeners();

    // Canvas事件
    this.setupCanvasEvents();

    // 粘贴事件
    this.setupPasteEvents();

    // 窗口大小改变
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  setupSettingListeners() {
    const settingIds = [
      'sourceLang', 'targetLang',
      'showOriginalImage', 'showOriginalText', 'showTranslatedText',
      'originalTextColor', 'translatedTextColor', 'originalTextSize', 'translatedTextSize',
      'originalTextBold', 'translatedTextBold', 'originalTextUnderline', 'translatedTextUnderline',
      'originalTextWrap', 'translatedTextWrap',
      'originalTextOffsetX', 'originalTextOffsetY', 'translatedTextOffsetX', 'translatedTextOffsetY',
      'textBackgroundOpacity', 'textBackgroundColor', 'boxBorderColor', 'boxBorderWidth', 'showBorder'
    ];

    // 设置切换按钮事件
    this.setupToggleButtons();

    // 设置数字输入框支持上下键
    this.setupNumberInputs();

    settingIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => this.updateSetting(id, e));
        element.addEventListener('input', (e) => this.updateSetting(id, e));
      }
    });
  }

  updateSetting(id, event) {
    const element = event.target;
    let value = element.type === 'checkbox' ? element.checked : element.value;

    // 映射设置名称
    const settingMap = {
      'sourceLang': 'defaultSourceLang',
      'targetLang': 'defaultTargetLang'
    };

    const settingName = settingMap[id] || id;

    // 转换数值类型
    if (id.includes('Size') || id === 'textBackgroundOpacity') {
      value = parseInt(value);
    }

    this.settings[settingName] = value;
    this.saveSettings();

    // 更新范围值显示
    if (element.type === 'range') {
      const valueElement = document.getElementById(id + 'Value');
      if (valueElement) {
        const unit = id === 'textBackgroundOpacity' ? '%' : 'px';
        valueElement.textContent = value + unit;
      }
    }

    // 实时更新画布
    if (this.currentImage) {
      this.redrawCanvas();
    }
  }

  updateSettingsUI() {
    // 更新所有设置UI
    document.getElementById('sourceLang').value = this.settings.defaultSourceLang || 'auto';
    document.getElementById('targetLang').value = this.settings.defaultTargetLang || 'zh';

    // 更新显示选项和对应按钮
    const displaySettings = [
      'showOriginalImage', 'showOriginalText', 'showTranslatedText', 'showBorder'
    ];
    displaySettings.forEach(setting => {
      const checkbox = document.getElementById(setting);
      const button = document.querySelector(`[data-target="${setting}"]`);
      if (checkbox) checkbox.checked = this.settings[setting];
      if (button) button.classList.toggle('active', this.settings[setting]);
    });

    // 更新文本样式
    document.getElementById('originalTextColor').value = this.settings.originalTextColor;
    document.getElementById('translatedTextColor').value = this.settings.translatedTextColor;
    document.getElementById('originalTextSize').value = this.settings.originalTextSize;
    document.getElementById('translatedTextSize').value = this.settings.translatedTextSize;

    // 更新偏移设置
    document.getElementById('originalTextOffsetX').value = this.settings.originalTextOffsetX || 0;
    document.getElementById('originalTextOffsetY').value = this.settings.originalTextOffsetY || 0;
    document.getElementById('translatedTextOffsetX').value = this.settings.translatedTextOffsetX || 0;
    document.getElementById('translatedTextOffsetY').value = this.settings.translatedTextOffsetY || 0;

    // 更新样式切换按钮
    const styleSettings = [
      'originalTextBold', 'originalTextUnderline', 'originalTextWrap',
      'translatedTextBold', 'translatedTextUnderline', 'translatedTextWrap'
    ];
    styleSettings.forEach(setting => {
      const checkbox = document.getElementById(setting);
      const button = document.querySelector(`[data-target="${setting}"]`);
      if (checkbox) checkbox.checked = this.settings[setting];
      if (button) button.classList.toggle('active', this.settings[setting]);
    });

    // 更新背景和边框设置
    document.getElementById('textBackgroundColor').value = this.settings.textBackgroundColor || '#000000';
    document.getElementById('textBackgroundOpacity').value = this.settings.textBackgroundOpacity;
    document.getElementById('boxBorderColor').value = this.settings.boxBorderColor || '#00FF00';
    document.getElementById('boxBorderWidth').value = this.settings.boxBorderWidth || 2;

    // 更新范围值显示
    const rangeElements = [
      { id: 'textBackgroundOpacity', unit: '%' },
      { id: 'boxBorderWidth', unit: 'px' }
    ];
    rangeElements.forEach(({ id, unit }) => {
      const valueElement = document.getElementById(id + 'Value');
      if (valueElement) {
        valueElement.textContent = this.settings[id] + unit;
      }
    });

    // 更新API状态显示
    this.updateAPIStatus();
  }

  setupCanvas() {
    this.resizeCanvas();
  }

  showSettings() {
    document.getElementById('settingsDrawer').classList.add('open');
  }

  hideSettings() {
    document.getElementById('settingsDrawer').classList.remove('open');
  }

  setupPasteEvents() {
    // 监听键盘粘贴事件
    document.addEventListener('paste', (e) => this.handlePaste(e));

    // 确保Canvas能接收焦点
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
    });
  }

  async handlePaste(e) {
    e.preventDefault();

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          try {
            this.showToast('正在处理粘贴的图片...');
            const imageData = await this.fileToBase64(file);
            await this.processImage(imageData);
            this.showToast('图片粘贴成功！', 'success');
          } catch (error) {
            console.error('粘贴图片失败:', error);
            this.showError('粘贴图片失败: ' + error.message);
          }
        }
        break;
      }
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  setupToggleButtons() {
    // 显示选项切换按钮
    const displayToggles = ['showOriginalImageBtn', 'showOriginalTextBtn', 'showTranslatedTextBtn', 'showBorderBtn'];
    displayToggles.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.toggleSetting(btn));
      }
    });

    // 样式切换按钮
    const styleToggles = [
      'originalTextBoldBtn', 'originalTextUnderlineBtn', 'originalTextWrapBtn',
      'translatedTextBoldBtn', 'translatedTextUnderlineBtn', 'translatedTextWrapBtn'
    ];
    styleToggles.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.toggleSetting(btn));
      }
    });
  }

  setupNumberInputs() {
    const numberInputs = [
      'originalTextSize', 'translatedTextSize',
      'originalTextOffsetX', 'originalTextOffsetY',
      'translatedTextOffsetX', 'translatedTextOffsetY'
    ];

    numberInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        // 支持键盘上下键调整数值
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            input.value = Math.min(parseInt(input.max), parseInt(input.value) + 1);
            this.updateSetting(inputId, { target: input });
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            input.value = Math.max(parseInt(input.min), parseInt(input.value) - 1);
            this.updateSetting(inputId, { target: input });
          }
        });
      }
    });
  }

  toggleSetting(button) {
    const targetId = button.getAttribute('data-target');
    const checkbox = document.getElementById(targetId);

    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      button.classList.toggle('active', checkbox.checked);
      this.updateSetting(targetId, { target: checkbox });
    }
  }

  setupCanvasEvents() {
    // 鼠标滚轮缩放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.zoomAt(mouseX, mouseY, delta);
    });

    // 鼠标拖拽
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.offsetX += deltaX;
        this.offsetY += deltaY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.redrawCanvas();
        this.updateCanvasInfo();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
  }

  resizeCanvas() {
    // 设置Canvas为全屏大小
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.redrawCanvas();
  }

  zoomAt(x, y, delta) {
    const prevScale = this.scale;
    this.scale *= delta;
    this.scale = Math.max(0.1, Math.min(5, this.scale));

    if (this.scale !== prevScale) {
      const scaleChange = this.scale / prevScale;
      this.offsetX = x - scaleChange * (x - this.offsetX);
      this.offsetY = y - scaleChange * (y - this.offsetY);

      this.redrawCanvas();
      this.updateCanvasInfo();
    }
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.redrawCanvas();
    this.updateCanvasInfo();
  }

  updateCanvasInfo() {
    // Canvas信息现在显示在状态提示中
    // const info = `缩放: ${Math.round(this.scale * 100)}% | 位置: (${Math.round(this.offsetX)}, ${Math.round(this.offsetY)})`;
    // console.log(info);
  }

  async takeScreenshot() {
    try {
      this.showStatus('准备截图...', true);

      if (window.ocrPluginAPI && window.ocrPluginAPI.takeScreenshot) {
        const screenshotData = await window.ocrPluginAPI.takeScreenshot();
        if (screenshotData) {
          await this.processImage(screenshotData);
        } else {
          this.showError('截图取消或失败');
        }
      } else {
        this.showError('截图功能不可用，请检查插件配置');
      }
    } catch (error) {
      console.error('截图失败:', error);
      this.showError('截图失败: ' + error.message);
    } finally {
      this.hideStatus();
    }
  }

  async openImage() {
    try {
      if (window.ocrPluginAPI && window.ocrPluginAPI.selectImage) {
        const imageData = await window.ocrPluginAPI.selectImage();
        if (imageData) {
          await this.processImage(imageData);
        }
      } else {
        // 备用方案：使用文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
              await this.processImage(e.target.result);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('打开图片失败:', error);
      this.showError('打开图片失败: ' + error.message);
    }
  }

  async processImage(imageData) {
    try {
      this.showStatus('正在加载图片...', true);

      // 加载图片
      const img = new Image();
      img.onload = async () => {
        this.currentImage = img;
        this.resetView();
        this.redrawCanvas();

        // 启用按钮
        document.getElementById('resetViewBtn').disabled = false;
        document.getElementById('saveImageBtn').disabled = false;

        // 进行OCR识别
        await this.performOCR(imageData);
      };

      img.onerror = () => {
        this.showError('图片加载失败');
      };

      img.src = imageData;

    } catch (error) {
      console.error('处理图片失败:', error);
      this.showError('处理图片失败: ' + error.message);
    }
  }

  async performOCR(imageData) {
    try {
      this.showStatus('正在识别文字...', true);

      if (!this.settings.tencentSecretId || !this.settings.tencentSecretKey) {
        this.showError('请先配置腾讯云API密钥');
        return;
      }

      // 调用OCR API
      if (window.ocrPluginAPI && window.ocrPluginAPI.performOCR) {
        const results = await window.ocrPluginAPI.performOCR({
          imageData: imageData,
          secretId: this.settings.tencentSecretId,
          secretKey: this.settings.tencentSecretKey,
          sourceLang: this.settings.defaultSourceLang,
          targetLang: this.settings.defaultTargetLang
        });

        if (results && results.length > 0) {
          this.ocrResults = results;
          this.redrawCanvas();
          document.getElementById('copyTextBtn').disabled = false;
          this.showSuccess(`成功识别 ${results.length} 个文本区域`);
        } else {
          this.showError('未识别到任何文字');
        }
      } else {
        this.showError('OCR功能不可用，请检查插件配置');
      }

    } catch (error) {
      console.error('OCR识别失败:', error);
      this.showError('OCR识别失败: ' + error.message);
    } finally {
      this.hideStatus();
    }
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.currentImage) return;

    // 保存当前状态
    this.ctx.save();

    // 应用变换
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // 绘制原始图片（如果启用）
    if (this.settings.showOriginalImage) {
      this.ctx.drawImage(this.currentImage, 0, 0);
    }

    // 绘制OCR结果
    this.drawOCRResults();

    // 恢复状态
    this.ctx.restore();
  }

  drawOCRResults() {
    if (!this.ocrResults || this.ocrResults.length === 0) {
      console.log('没有OCR结果需要绘制');
      return;
    }

    console.log('开始绘制OCR结果，共', this.ocrResults.length, '个区域');

    const showOriginal = this.settings.showOriginalText;
    const showTranslated = this.settings.showTranslatedText;

    if (!showOriginal && !showTranslated) {
      console.log('文本显示被禁用');
      return;
    }

    this.ocrResults.forEach((result, index) => {
      console.log(`处理第${index + 1}个OCR结果:`, result);

      if (!result.polygon || result.polygon.length === 0) {
        console.warn(`第${index + 1}个结果没有坐标信息`);
        return;
      }

      // 计算文本区域
      const minX = Math.min(...result.polygon.map(p => p.X || p.x || 0));
      const maxX = Math.max(...result.polygon.map(p => p.X || p.x || 0));
      const minY = Math.min(...result.polygon.map(p => p.Y || p.y || 0));
      const maxY = Math.max(...result.polygon.map(p => p.Y || p.y || 0));

      const width = maxX - minX;
      const height = maxY - minY;

      console.log(`文本区域: (${minX}, ${minY}) 到 (${maxX}, ${maxY}), 大小: ${width}x${height}`);

      // 绘制文本背景
      const bgOpacity = this.settings.textBackgroundOpacity / 100;
      if (bgOpacity > 0) {
        const bgColor = this.settings.textBackgroundColor || '#000000';
        const r = parseInt(bgColor.slice(1, 3), 16);
        const g = parseInt(bgColor.slice(3, 5), 16);
        const b = parseInt(bgColor.slice(5, 7), 16);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        this.ctx.fillRect(minX, minY, width, height);
      }

      // 绘制边框
      const showBorder = this.settings.showBorder !== false; // 默认显示
      const borderWidth = this.settings.boxBorderWidth || 2;
      if (showBorder && borderWidth > 0) {
        this.ctx.strokeStyle = this.settings.boxBorderColor || '#00ff00';
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(minX, minY, width, height);
      }

      // 计算文本位置 - 使用统一的基准位置
      const baseX = minX + 5;
      const baseY = minY + Math.max(this.settings.originalTextSize, this.settings.translatedTextSize);

      // 绘制原始文本
      if (showOriginal && result.originalText) {
        console.log(`绘制原始文本: "${result.originalText}"`);
        const offsetX = parseInt(this.settings.originalTextOffsetX) || 0;
        const offsetY = parseInt(this.settings.originalTextOffsetY) || 0;
        const origX = Math.max(0, baseX + offsetX);
        const origY = Math.max(this.settings.originalTextSize, baseY + offsetY);

        console.log(`原始文本坐标: (${origX}, ${origY}), 偏移: (${offsetX}, ${offsetY})`);

        this.drawText(
          result.originalText,
          origX,
          origY,
          Math.max(100, width - 10),
          this.settings.originalTextColor,
          this.settings.originalTextSize,
          this.settings.originalTextBold,
          this.settings.originalTextUnderline,
          this.settings.originalTextWrap
        );
      }

      // 绘制翻译文本 - 使用相同的基准位置
      if (showTranslated && result.translatedText) {
        console.log(`绘制翻译文本: "${result.translatedText}"`);
        const offsetX = parseInt(this.settings.translatedTextOffsetX) || 0;
        const offsetY = parseInt(this.settings.translatedTextOffsetY) || 0; // 默认偏移改为0
        const transX = Math.max(0, baseX + offsetX);
        const transY = Math.max(this.settings.translatedTextSize, baseY + offsetY);

        console.log(`翻译文本坐标: (${transX}, ${transY}), 偏移: (${offsetX}, ${offsetY})`);

        this.drawText(
          result.translatedText,
          transX,
          transY,
          Math.max(100, width - 10),
          this.settings.translatedTextColor,
          this.settings.translatedTextSize,
          this.settings.translatedTextBold,
          this.settings.translatedTextUnderline,
          this.settings.translatedTextWrap
        );
      }
    });
  }

  drawText(text, x, y, maxWidth, color, size, bold, underline, wrap = true) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${bold ? 'bold' : 'normal'} ${size}px Arial, sans-serif`;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    console.log(`绘制文本: "${text}" 在 (${x}, ${y}), 换行: ${wrap}`);

    if (!wrap) {
      // 不换行，直接绘制单行
      this.ctx.fillText(text, x, y);

      if (underline) {
        const textWidth = this.ctx.measureText(text).width;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + 2);
        this.ctx.lineTo(x + textWidth, y + 2);
        this.ctx.stroke();
      }
      return;
    }

    // 文本换行处理
    const words = text.split('');
    let line = '';
    let lineY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, lineY);

        if (underline) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, lineY + 2);
          this.ctx.lineTo(x + this.ctx.measureText(line).width, lineY + 2);
          this.ctx.strokeStyle = color;
          this.ctx.stroke();
        }

        line = words[i];
        lineY += size + 4;
      } else {
        line = testLine;
      }
    }

    if (line) {
      this.ctx.fillText(line, x, lineY);

      if (underline) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, lineY + 2);
        this.ctx.lineTo(x + this.ctx.measureText(line).width, lineY + 2);
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
      }
    }
  }

  async saveImage() {
    try {
      if (!this.currentImage) {
        this.showError('没有可保存的图片');
        return;
      }

      // 创建新的canvas用于导出
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.currentImage.width;
      exportCanvas.height = this.currentImage.height;
      const exportCtx = exportCanvas.getContext('2d');

      // 绘制图片和OCR结果
      exportCtx.drawImage(this.currentImage, 0, 0);

      // 临时设置scale和offset为1和0来正确绘制OCR结果
      const originalScale = this.scale;
      const originalOffsetX = this.offsetX;
      const originalOffsetY = this.offsetY;

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      // 在导出canvas上绘制OCR结果
      const originalCtx = this.ctx;
      this.ctx = exportCtx;
      this.drawOCRResults();
      this.ctx = originalCtx;

      // 恢复原始值
      this.scale = originalScale;
      this.offsetX = originalOffsetX;
      this.offsetY = originalOffsetY;

      // 下载图片
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr_result_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        this.showSuccess('图片已保存');
      });

    } catch (error) {
      console.error('保存图片失败:', error);
      this.showError('保存图片失败: ' + error.message);
    }
  }

  copyText() {
    try {
      if (!this.ocrResults || this.ocrResults.length === 0) {
        this.showError('没有可复制的文本');
        return;
      }

      const showOriginal = this.settings.showOriginalText;
      const showTranslated = this.settings.showTranslatedText;

      let textToCopy = '';

      this.ocrResults.forEach((result, index) => {
        if (index > 0) textToCopy += '\n\n';

        if (showOriginal && result.originalText) {
          textToCopy += `原文: ${result.originalText}`;
        }

        if (showTranslated && result.translatedText) {
          if (showOriginal) textToCopy += '\n';
          textToCopy += `译文: ${result.translatedText}`;
        }
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          this.showSuccess('文本已复制到剪贴板');
        });
      } else {
        // 备用方案
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showSuccess('文本已复制到剪贴板');
      }

    } catch (error) {
      console.error('复制文本失败:', error);
      this.showError('复制文本失败: ' + error.message);
    }
  }


  showStatus(message, showProgress = false) {
    console.log('状态:', message);
    this.showToast(message);

    if (showProgress) {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.style.display = 'block';
      }
    }
  }

  hideStatus() {
    console.log('隐藏状态');
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  showError(message) {
    console.error('错误:', message);
    this.showToast(message, 'error');
    this.hideStatus();
  }

  showSuccess(message) {
    console.log('成功:', message);
    this.showToast(message, 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    toast.textContent = message;
    toast.className = 'status-toast show';

    if (type === 'error') {
      toast.style.background = 'rgba(244, 67, 54, 0.9)';
    } else if (type === 'success') {
      toast.style.background = 'rgba(76, 175, 80, 0.9)';
    } else {
      toast.style.background = 'rgba(0, 0, 0, 0.8)';
    }

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.ocrTranslator = new OCRTranslator();
});
