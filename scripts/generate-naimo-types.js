/**
 * 生成 Naimo API 类型声明文件
 * 
 * 用途：从 webpagePreload.ts 动态提取 naimo 对象结构，生成插件开发所需的类型声明
 * 输出：plugins-doc/naimo.d.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project, SyntaxKind } from 'ts-morph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径
const SOURCE_FILE = path.join(__dirname, '../src/main/preloads/webpagePreload.ts');
const OUTPUT_FILE = path.join(__dirname, '../plugins-doc/template/naimo.d.ts');

console.log('🚀 开始动态生成 Naimo API 类型声明...\n');

/**
 * 从类型文本中提取引用的类型名称
 */
function extractTypeNamesFromText(typeText) {
  const typeNames = new Set();
  // 匹配类型名称（排除基础类型）
  const matches = typeText.match(/\b[A-Z][a-zA-Z0-9]*\b/g);
  if (matches) {
    for (const match of matches) {
      // 跳过基础类型
      if (!['Promise', 'Array', 'Buffer', 'Function', 'Date', 'RegExp', 'Error'].includes(match)) {
        typeNames.add(match);
      }
    }
  }
  return typeNames;
}

/**
 * 通过类型名称查找并收集类型定义
 */
function collectTypeByName(typeName, project, collectedTypes, visitedTypes) {
  // 如果已经收集过，跳过
  if (collectedTypes.has(typeName)) {
    return;
  }

  // 在项目中查找这个类型
  const sourceFiles = project.getSourceFiles();
  for (const file of sourceFiles) {
    // 跳过 node_modules
    if (file.getFilePath().includes('node_modules')) continue;

    // 查找接口
    const iface = file.getInterface(typeName);
    if (iface) {
      // 获取 JSDoc 注释
      const jsDocs = iface.getJsDocs();
      let jsDocText = '';
      if (jsDocs.length > 0) {
        jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
      }

      const typeText = jsDocText + iface.getText().replace(/^export\s+/, '');
      collectedTypes.set(typeName, {
        name: typeName,
        kind: 'interface',
        text: typeText,
        sourceFile: file.getFilePath()
      });

      // 从类型文本中提取其他引用的类型
      const referencedTypes = extractTypeNamesFromText(typeText);
      for (const refType of referencedTypes) {
        if (refType !== typeName) {
          collectTypeByName(refType, project, collectedTypes, visitedTypes);
        }
      }
      return;
    }

    // 查找类型别名
    const typeAlias = file.getTypeAlias(typeName);
    if (typeAlias) {
      // 获取 JSDoc 注释
      const jsDocs = typeAlias.getJsDocs();
      let jsDocText = '';
      if (jsDocs.length > 0) {
        jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
      }

      const typeText = jsDocText + typeAlias.getText().replace(/^export\s+/, '');
      collectedTypes.set(typeName, {
        name: typeName,
        kind: 'type',
        text: typeText,
        sourceFile: file.getFilePath()
      });

      // 从类型文本中提取其他引用的类型
      const referencedTypes = extractTypeNamesFromText(typeText);
      for (const refType of referencedTypes) {
        if (refType !== typeName) {
          collectTypeByName(refType, project, collectedTypes, visitedTypes);
        }
      }
      return;
    }

    // 查找枚举
    const enumDecl = file.getEnum(typeName);
    if (enumDecl) {
      // 获取 JSDoc 注释
      const jsDocs = enumDecl.getJsDocs();
      let jsDocText = '';
      if (jsDocs.length > 0) {
        jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
      }

      const typeText = jsDocText + enumDecl.getText().replace(/^export\s+/, '');
      collectedTypes.set(typeName, {
        name: typeName,
        kind: 'enum',
        text: typeText,
        sourceFile: file.getFilePath()
      });
      return;
    }
  }
}

/**
 * 递归追踪类型的所有依赖
 */
function collectTypeDependencies(type, project, collectedTypes = new Map(), visitedTypes = new Set()) {
  const typeText = type.getText();

  // 避免循环依赖
  if (visitedTypes.has(typeText)) {
    return collectedTypes;
  }
  visitedTypes.add(typeText);

  // 处理联合类型
  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();
    for (const unionType of unionTypes) {
      collectTypeDependencies(unionType, project, collectedTypes, visitedTypes);
    }
    return collectedTypes;
  }

  // 处理数组类型
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    if (elementType) {
      collectTypeDependencies(elementType, project, collectedTypes, visitedTypes);
    }
    return collectedTypes;
  }

  // 处理 Promise 类型
  if (typeText.startsWith('Promise<')) {
    const typeArgs = type.getTypeArguments();
    for (const typeArg of typeArgs) {
      collectTypeDependencies(typeArg, project, collectedTypes, visitedTypes);
    }
    return collectedTypes;
  }

  // 获取类型的符号
  const symbol = type.getSymbol();
  if (!symbol) {
    return collectedTypes;
  }

  const typeName = symbol.getName();

  // 跳过基础类型和内置类型
  if (['string', 'number', 'boolean', 'void', 'any', 'unknown', 'never', 'undefined', 'null', 'Array', 'Promise', 'Buffer', 'Function'].includes(typeName)) {
    return collectedTypes;
  }

  // 如果已经收集过这个类型，跳过
  if (collectedTypes.has(typeName)) {
    return collectedTypes;
  }

  // 获取类型声明
  const declarations = symbol.getDeclarations();
  if (declarations.length === 0) {
    return collectedTypes;
  }

  const declaration = declarations[0];
  const sourceFile = declaration.getSourceFile();

  // 跳过 node_modules 中的类型
  if (sourceFile.getFilePath().includes('node_modules')) {
    return collectedTypes;
  }

  // 跳过 Electron 等外部类型
  if (sourceFile.getFilePath().includes('electron')) {
    return collectedTypes;
  }

  // 提取类型定义的文本
  let typeDefText = '';
  let typeDefKind = '';

  if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
    typeDefKind = 'interface';
    const iface = declaration;

    // 获取 JSDoc 注释
    const jsDocs = iface.getJsDocs();
    let jsDocText = '';
    if (jsDocs.length > 0) {
      jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
    }

    typeDefText = jsDocText + iface.getText().replace(/^export\s+/, '');

    // 先标记已收集（避免循环引用导致无限递归）
    collectedTypes.set(typeName, {
      name: typeName,
      kind: typeDefKind,
      text: typeDefText,
      sourceFile: sourceFile.getFilePath()
    });

    // 从类型文本中提取引用的类型名称
    const referencedTypes = extractTypeNamesFromText(typeDefText);
    for (const refType of referencedTypes) {
      if (refType !== typeName) {
        collectTypeByName(refType, project, collectedTypes, visitedTypes);
      }
    }

    // 递归处理接口成员的类型
    const members = iface.getMembers();
    for (const member of members) {
      if (member.getKind() === SyntaxKind.PropertySignature) {
        const memberType = member.getType();
        collectTypeDependencies(memberType, project, collectedTypes, visitedTypes);
      } else if (member.getKind() === SyntaxKind.MethodSignature) {
        // 对于方法签名，需要分析参数和返回类型
        const params = member.getParameters();
        for (const param of params) {
          const paramType = param.getType();
          collectTypeDependencies(paramType, project, collectedTypes, visitedTypes);
        }
        const returnType = member.getReturnType();
        collectTypeDependencies(returnType, project, collectedTypes, visitedTypes);
      }
    }
  } else if (declaration.getKind() === SyntaxKind.TypeAliasDeclaration) {
    typeDefKind = 'type';
    const typeAlias = declaration;

    // 获取 JSDoc 注释
    const jsDocs = typeAlias.getJsDocs();
    let jsDocText = '';
    if (jsDocs.length > 0) {
      jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
    }

    typeDefText = jsDocText + typeAlias.getText().replace(/^export\s+/, '');

    // 先标记已收集
    collectedTypes.set(typeName, {
      name: typeName,
      kind: typeDefKind,
      text: typeDefText,
      sourceFile: sourceFile.getFilePath()
    });

    // 从类型文本中提取引用的类型名称
    const referencedTypes = extractTypeNamesFromText(typeDefText);
    for (const refType of referencedTypes) {
      if (refType !== typeName) {
        collectTypeByName(refType, project, collectedTypes, visitedTypes);
      }
    }

    // 递归处理类型别名引用的类型
    const aliasType = typeAlias.getType();
    collectTypeDependencies(aliasType, project, collectedTypes, visitedTypes);
  } else if (declaration.getKind() === SyntaxKind.EnumDeclaration) {
    typeDefKind = 'enum';
    const enumDecl = declaration;

    // 获取 JSDoc 注释
    const jsDocs = enumDecl.getJsDocs();
    let jsDocText = '';
    if (jsDocs.length > 0) {
      jsDocText = jsDocs.map(doc => doc.getText()).join('\n') + '\n';
    }

    typeDefText = jsDocText + enumDecl.getText().replace(/^export\s+/, '');

    // 存储枚举类型
    collectedTypes.set(typeName, {
      name: typeName,
      kind: typeDefKind,
      text: typeDefText,
      sourceFile: sourceFile.getFilePath()
    });
  }

  return collectedTypes;
}

/**
 * 从 naimo 对象中提取所有使用的类型
 */
function extractUsedTypes(naimoStructure, project) {
  const collectedTypes = new Map();

  // 获取 webpagePreload.ts 文件
  const sourceFile = project.getSourceFile(SOURCE_FILE);
  if (!sourceFile) {
    throw new Error('无法找到源文件');
  }

  // 获取 naimo 变量
  const naimoVar = sourceFile.getVariableDeclaration('naimo');
  if (!naimoVar) {
    throw new Error('无法找到 naimo 变量');
  }

  const initializer = naimoVar.getInitializer();
  if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error('naimo 不是对象字面量');
  }

  // 遍历 naimo 对象的所有属性
  const properties = initializer.getProperties();
  for (const prop of properties) {
    if (prop.getKind() === SyntaxKind.PropertyAssignment) {
      const propName = prop.getName();
      const propInitializer = prop.getInitializer();

      if (!propInitializer) continue;

      // 获取属性的类型
      const propType = propInitializer.getType();

      // 如果是对象字面量，分析其方法
      if (propInitializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const objProps = propInitializer.getProperties();
        for (const objProp of objProps) {
          if (objProp.getKind() === SyntaxKind.PropertyAssignment) {
            const methodInit = objProp.getInitializer();
            if (methodInit && methodInit.getKind() === SyntaxKind.ArrowFunction) {
              // 分析函数的参数类型
              const params = methodInit.getParameters();
              for (const param of params) {
                const paramType = param.getType();
                collectTypeDependencies(paramType, project, collectedTypes, new Set());
              }

              // 分析函数的返回类型
              const returnType = methodInit.getReturnType();
              collectTypeDependencies(returnType, project, collectedTypes, new Set());
            }
          }
        }
      } else if (propInitializer.getKind() === SyntaxKind.ArrowFunction) {
        // 直接是函数，分析参数和返回类型
        const params = propInitializer.getParameters();
        for (const param of params) {
          const paramType = param.getType();
          collectTypeDependencies(paramType, project, collectedTypes, new Set());
        }

        const returnType = propInitializer.getReturnType();
        collectTypeDependencies(returnType, project, collectedTypes, new Set());
      } else {
        // 其他类型（如 ubrowser, ibrowser）
        collectTypeDependencies(propType, project, collectedTypes, new Set());
      }
    }
  }

  return collectedTypes;
}

/**
 * 提取 UBrowser 类型定义（从源码动态分析）
 */
function extractUBrowserType(project) {
  const rendererFile = project.getSourceFile(f => f.getFilePath().includes('auto-puppeteer/renderer.ts'));
  if (!rendererFile) {
    console.warn('⚠️  未找到 UBrowser 源文件，使用手动定义');
    return null;
  }

  // 查找 createUBrowserObject 函数
  const createFunc = rendererFile.getFunction('createUBrowserObject');
  if (!createFunc) {
    console.warn('⚠️  未找到 createUBrowserObject 函数，使用手动定义');
    return null;
  }

  // 直接使用 ts-morph API 分析函数
  const funcBody = createFunc.getBodyText();

  // 在函数体中查找 api 对象定义
  const statements = createFunc.getStatements();
  let apiObject = null;

  for (const statement of statements) {
    if (statement.getKind() === SyntaxKind.VariableStatement) {
      const declarations = statement.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
      for (const decl of declarations) {
        if (decl.getName() === 'api') {
          const initializer = decl.getInitializer();
          if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
            apiObject = initializer;
            break;
          }
        }
      }
      if (apiObject) break;
    }
  }

  if (!apiObject) {
    console.warn('⚠️  未找到 api 对象定义，使用手动定义');
    return null;
  }

  // 提取所有方法
  const methods = [];
  const properties = apiObject.getProperties();

  for (const prop of properties) {
    const name = prop.getName();

    // 获取 JSDoc 注释
    const jsDocs = prop.getJsDocs();
    let comment = '';
    if (jsDocs.length > 0) {
      comment = jsDocs.map(doc => {
        const text = doc.getText();
        // 提取注释内容（去掉 /** 和 */）
        const match = text.match(/\/\*\*\s*(.*?)\s*\*\//s);
        return match ? match[1].trim() : '';
      }).filter(t => t).join('\n');
    }

    // 处理方法声明（对象简写语法，如 goto(url) { ... }）
    if (prop.getKind() === SyntaxKind.MethodDeclaration) {
      const method = prop;
      const params = method.getParameters();
      const paramStrs = params.map(p => {
        const paramName = p.getName();
        const paramType = p.getTypeNode()?.getText() || 'any';
        const isOptional = p.isOptional() || p.hasInitializer();
        const isRest = p.isRestParameter();

        let paramStr = isRest ? '...' : '';
        paramStr += paramName;
        paramStr += isOptional ? '?' : '';
        paramStr += ': ' + paramType;

        return paramStr;
      }).join(', ');

      // 推断返回类型
      const returnType = name === 'run'
        ? 'Promise<[...any[], BrowserInstance]>'
        : 'UBrowser';

      methods.push({ name, params: paramStrs, returnType, comment });
    }
    // 处理属性赋值（箭头函数语法，如 goto: (url) => { ... }）
    else if (prop.getKind() === SyntaxKind.PropertyAssignment) {
      const initializer = prop.getInitializer();

      if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        const params = initializer.getParameters();
        const paramStrs = params.map(p => {
          const paramName = p.getName();
          const paramType = p.getTypeNode()?.getText() || 'any';
          const isOptional = p.isOptional() || p.hasInitializer();
          const isRest = p.isRestParameter();

          let paramStr = isRest ? '...' : '';
          paramStr += paramName;
          paramStr += isOptional ? '?' : '';
          paramStr += ': ' + paramType;

          return paramStr;
        }).join(', ');

        // 推断返回类型
        const returnType = name === 'run'
          ? 'Promise<[...any[], BrowserInstance]>'
          : 'UBrowser';

        methods.push({ name, params: paramStrs, returnType, comment });
      }
    }
  }

  if (methods.length === 0) {
    console.warn('⚠️  未提取到任何方法，使用手动定义');
    return null;
  }

  console.log(`   从源码提取了 ${methods.length} 个 UBrowser 方法`);

  // 生成 UBrowser 接口
  let typeText = `/**
 * UBrowser 浏览器实例
 * 可编程浏览器，用于自动化操作网页
 * 
 * 通过链式调用构建操作队列，最后调用 run() 执行
 * @example
 * await naimo.ubrowser.goto("https://example.com").wait("#content").click(".button").run()
 */
interface UBrowser {
`;

  // 添加方法
  for (const method of methods) {
    if (method.comment) {
      typeText += `  /** ${method.comment} */\n`;
    }
    typeText += `  ${method.name}(${method.params}): ${method.returnType};\n`;
  }

  typeText += '}';

  return typeText;
}

/**
 * 手动添加必需的辅助类型（用于插件系统）
 */
function getPluginHelperTypes(project) {
  const helperTypes = new Map();

  // WindowConfig - 窗口配置接口
  collectTypeByName('WindowConfig', project, helperTypes, new Set());

  // DeviceOptions - 设备选项
  collectTypeByName('DeviceOptions', project, helperTypes, new Set());

  // UBrowser - 尝试从源码提取
  const ubrowserType = extractUBrowserType(project);
  if (ubrowserType) {
    helperTypes.set('UBrowser', {
      name: 'UBrowser',
      kind: 'interface',
      text: ubrowserType
    });
  } else {
    // 如果提取失败，使用手动定义
    helperTypes.set('UBrowser', {
      name: 'UBrowser',
      kind: 'interface',
      text: `/**
 * UBrowser 浏览器实例
 * 可编程浏览器，用于自动化操作网页
 */
interface UBrowser {
  goto(url: string, options?: WindowConfig): UBrowser;
  useragent(ua: string): UBrowser;
  viewport(width: number, height: number): UBrowser;
  hide(): UBrowser;
  show(): UBrowser;
  css(css: string): UBrowser;
  evaluate(func: Function | string, ...params: any[]): UBrowser;
  press(key: string, options?: { delay?: number }): UBrowser;
  click(selector: string): UBrowser;
  mousedown(selector: string): UBrowser;
  mouseup(): UBrowser;
  file(selector: string, payload: string | string[] | Buffer): UBrowser;
  type(selector: string, text: string, options?: { delay?: number }): UBrowser;
  value(selector: string, value: string): UBrowser;
  select(selector: string, ...values: string[]): UBrowser;
  check(selector: string, checked: boolean): UBrowser;
  focus(selector: string): UBrowser;
  scroll(selectorOrX: string | number, y?: number): UBrowser;
  paste(text: string): UBrowser;
  screenshot(options?: any): UBrowser;
  pdf(options?: any): UBrowser;
  device(options: DeviceOptions): UBrowser;
  wait(msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params: any[]): UBrowser;
  waitForSelector(selector: string, options?: { visible?: boolean; hidden?: boolean; timeout?: number }): UBrowser;
  when(selector: string): UBrowser;
  end(): UBrowser;
  devTools(mode?: 'right' | 'bottom' | 'undocked' | 'detach'): UBrowser;
  cookies(...urls: string[]): UBrowser;
  setCookie(...cookies: any[]): UBrowser;
  deleteCookie(...cookies: any[]): UBrowser;
  run(options?: WindowConfig): Promise<[...any[], BrowserInstance]>;
}`
    });
  }

  // BrowserInstance - 从源码提取
  collectTypeByName('BrowserInstance', project, helperTypes, new Set());

  // FeatureHandler - 功能处理器接口
  helperTypes.set('FeatureHandler', {
    name: 'FeatureHandler',
    kind: 'interface',
    text: `/**
 * 功能处理器接口
 */
interface FeatureHandler {
  /**
   * 功能进入钩子
   * @param params 触发参数
   * @param api 插件 API（预留，当前版本暂无可用方法）
   */
  onEnter?: (params: any, api?: any) => void | Promise<void>;
}`
  });

  // PluginExports - 插件导出接口
  helperTypes.set('PluginExports', {
    name: 'PluginExports',
    kind: 'interface',
    text: `/**
 * 插件导出接口
 * 
 * 在 preload.js 中使用 module.exports 导出功能处理器
 */
interface PluginExports {
  [featurePath: string]: FeatureHandler;
}`
  });

  return helperTypes;
}

/**
 * 提取函数参数类型
 */
function extractParameterType(param) {
  const type = param.getType();
  const typeText = type.getText();

  // 处理特殊类型
  if (typeText.includes('Promise')) {
    return typeText;
  }

  // 处理数组类型
  if (type.isArray()) {
    const elementType = type.getArrayElementType();
    return `${elementType.getText()}[]`;
  }

  // 处理联合类型
  if (type.isUnion()) {
    return type.getUnionTypes().map(t => t.getText()).join(' | ');
  }

  // 处理字面量类型
  if (type.isLiteral()) {
    return `"${type.getLiteralValue()}"`;
  }

  return typeText || 'any';
}

/**
 * 提取函数返回类型
 */
function extractReturnType(func) {
  const returnType = func.getReturnType();
  const typeText = returnType.getText();

  // 如果是 Promise 类型,尝试获取泛型参数
  if (typeText.includes('Promise')) {
    return typeText;
  }

  return typeText || 'void';
}

/**
 * 分析 naimo 对象结构
 */
function analyzeNaimoObject(sourceFile) {
  const naimoStructure = {};

  // 查找 naimo 对象定义
  const naimoVar = sourceFile.getVariableDeclaration('naimo');
  if (!naimoVar) {
    throw new Error('未找到 naimo 对象定义');
  }

  const initializer = naimoVar.getInitializer();
  if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error('naimo 不是对象字面量');
  }

  // 遍历对象的所有属性
  const properties = initializer.getProperties();

  for (const prop of properties) {
    if (prop.getKind() === SyntaxKind.PropertyAssignment) {
      const name = prop.getName();
      const initializer = prop.getInitializer();

      // 跳过注释
      const leadingComments = prop.getLeadingCommentRanges();
      let comment = '';
      if (leadingComments.length > 0) {
        comment = leadingComments[0].getText().trim();
        // 提取注释中的描述
        const match = comment.match(/\/\/\s*=+\s*(.+?)\s*=+/);
        if (match) {
          comment = match[1].trim();
        }
      }

      // 如果是对象字面量，提取其方法
      if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const methods = {};
        const objProps = initializer.getProperties();

        for (const objProp of objProps) {
          if (objProp.getKind() === SyntaxKind.PropertyAssignment) {
            const methodName = objProp.getName();
            const methodInit = objProp.getInitializer();

            // 提取方法注释
            let methodComment = '';
            const jsDocComments = objProp.getLeadingCommentRanges();
            if (jsDocComments.length > 0) {
              const commentText = jsDocComments[jsDocComments.length - 1].getText();
              // 提取 /** 注释内容 */
              const match = commentText.match(/\/\*\*\s*(.+?)\s*\*\//);
              if (match) {
                methodComment = match[1].trim();
              }
            }

            // 检查是否是箭头函数
            if (methodInit && methodInit.getKind() === SyntaxKind.ArrowFunction) {
              const params = methodInit.getParameters();
              const parameters = params.map(p => {
                const paramName = p.getName();
                const paramType = p.getType().getText();
                const isOptional = p.isOptional();
                const hasDefault = p.hasInitializer();
                const isRest = p.isRestParameter();

                return {
                  name: paramName,
                  type: paramType,
                  optional: isOptional || hasDefault,
                  rest: isRest
                };
              });

              // 尝试推断返回类型
              let returnType = 'any';
              try {
                const bodyText = methodInit.getBodyText();
                // 如果调用了 ipcRouter 的方法，返回类型是 Promise
                if (bodyText.includes('ipcRouter.')) {
                  returnType = 'Promise<any>';
                } else if (bodyText.includes('log.')) {
                  returnType = 'void';
                } else if (bodyText.includes('hooks.')) {
                  returnType = 'void';
                } else if (bodyText.includes('return')) {
                  returnType = 'any';
                }
              } catch (e) {
                // 忽略错误
              }

              methods[methodName] = {
                parameters,
                returnType,
                comment: methodComment
              };
            }
          }
        }

        naimoStructure[name] = {
          type: 'object',
          comment,
          methods
        };
      } else if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        // 直接是函数
        const params = initializer.getParameters();

        // 提取函数注释
        let functionComment = '';
        const jsDocComments = prop.getLeadingCommentRanges();
        if (jsDocComments.length > 0) {
          const commentText = jsDocComments[jsDocComments.length - 1].getText();
          // 提取 /** 注释内容 */
          const match = commentText.match(/\/\*\*\s*(.+?)\s*\*\//);
          if (match) {
            functionComment = match[1].trim();
          }
        }

        const parameters = params.map(p => {
          const paramName = p.getName();
          const paramType = p.getType().getText();
          const isOptional = p.isOptional();
          const isRest = p.isRestParameter();

          return {
            name: paramName,
            type: paramType,
            optional: isOptional,
            rest: isRest
          };
        });

        // 推断返回类型
        let returnType = 'void';
        try {
          const bodyText = initializer.getBodyText();
          if (bodyText.includes('return')) {
            returnType = 'Promise<Feature[]>';
          }
        } catch (e) {
          // 忽略错误
        }

        naimoStructure[name] = {
          type: 'function',
          comment: functionComment || comment,
          parameters,
          returnType
        };
      } else {
        // 其他类型（如 ubrowser, ibrowser）
        let typeName = 'any';

        // 特殊处理 ubrowser 和 ibrowser
        if (name === 'ubrowser' || name === 'ibrowser') {
          typeName = 'UBrowser';
        }

        naimoStructure[name] = {
          type: 'other',
          comment,
          typeName
        };
      }
    }
  }

  return naimoStructure;
}

/**
 * 生成接口定义
 */
function generateInterface(name, structure) {
  const interfaceName = `Naimo${name.charAt(0).toUpperCase() + name.slice(1)}`;
  let result = `/**\n * ${structure.comment || name + ' API'}\n */\ninterface ${interfaceName} {\n`;

  for (const [methodName, methodInfo] of Object.entries(structure.methods)) {
    const params = methodInfo.parameters.map(p => {
      const optional = p.optional ? '?' : '';
      const rest = p.rest ? '...' : '';
      return `${rest}${p.name}${optional}: ${p.type}`;
    }).join(', ');

    // 使用方法的注释，如果没有则使用方法名
    const comment = methodInfo.comment || methodName;
    result += `  /**\n   * ${comment}\n`;

    if (methodInfo.parameters.length > 0) {
      methodInfo.parameters.forEach(p => {
        const rest = p.rest ? '...' : '';
        result += `   * @param ${rest}${p.name} ${p.type}\n`;
      });
    }
    result += `   */\n`;
    result += `  ${methodName}(${params}): ${methodInfo.returnType};\n\n`;
  }

  result += '}\n';
  return result;
}

/**
 * 生成类型声明文件
 */
function generateTypeDeclaration(naimoStructure, extractedTypes, helperTypes) {
  let content = `/**
 * Naimo Tools 插件 API 类型声明
 * 
 * @version 2.0
 * @date ${new Date().toISOString().split('T')[0]}
 * 
 * 本文件由脚本自动生成，请勿手动修改
 * 生成脚本: scripts/generate-naimo-types.js
 * 源文件: src/main/preloads/webpagePreload.ts (动态分析提取)
 */

// ==================== 依赖类型定义 ====================

`;

  // 添加提取的类型（按文件分组）
  if (extractedTypes && extractedTypes.size > 0) {
    const typesByFile = new Map();

    // 按源文件分组
    for (const [typeName, typeInfo] of extractedTypes) {
      if (typeof typeInfo === 'object' && typeInfo.text) {
        const file = typeInfo.sourceFile || 'unknown';
        if (!typesByFile.has(file)) {
          typesByFile.set(file, []);
        }
        typesByFile.get(file).push(typeInfo);
      }
    }

    // 输出分组的类型
    for (const [file, types] of typesByFile) {
      const relativeFile = file.replace(/\\/g, '/').split('/src/')[1] || file;
      content += `// 从 ${relativeFile} 提取的类型\n\n`;
      for (const type of types) {
        content += type.text + '\n\n';
      }
    }
  }

  // 添加辅助类型
  if (helperTypes && helperTypes.size > 0) {
    content += `// 插件系统辅助类型\n\n`;
    for (const [typeName, typeInfo] of helperTypes) {
      content += typeInfo.text + '\n\n';
    }
  }

  content += `// ==================== 动态生成的 API 接口 ====================

`;

  // 生成各个子接口
  const objectInterfaces = [];
  const mainInterfaceProps = [];

  for (const [name, structure] of Object.entries(naimoStructure)) {
    if (structure.type === 'object') {
      const interfaceName = `Naimo${name.charAt(0).toUpperCase() + name.slice(1)}`;
      content += generateInterface(name, structure);
      content += '\n';
      objectInterfaces.push(interfaceName);
      mainInterfaceProps.push(`  /** ${structure.comment || name} */\n  ${name}: ${interfaceName};`);
    } else if (structure.type === 'function') {
      const params = structure.parameters.map(p => {
        const optional = p.optional ? '?' : '';
        const rest = p.rest ? '...' : '';
        return `${rest}${p.name}${optional}: ${p.type}`;
      }).join(', ');
      mainInterfaceProps.push(`  /**\n   * ${structure.comment || name}\n   */\n  ${name}(${params}): ${structure.returnType};`);
    } else {
      // 特殊类型（如 ubrowser, ibrowser）
      const typeName = structure.typeName || 'any';
      mainInterfaceProps.push(`  /** ${structure.comment || name} */\n  ${name}: ${typeName};`);
    }
  }

  // 生成主接口
  content += `// ==================== Naimo 主接口 ====================

/**
 * Naimo Tools 插件 API
 * 
 * 提供插件开发所需的所有 API
 */
interface Naimo {
${mainInterfaceProps.join('\n\n')}
}

// ==================== 全局声明 ====================

declare global {
  interface Window {
    /**
     * Naimo Tools 插件 API
     * 
     * 可在插件的 HTML 页面中通过 window.naimo 访问
     */
    naimo: Naimo;
  }
}

// ==================== 导出 ====================

export {
  Naimo,
  ${objectInterfaces.join(',\n  ')},
  ${Array.from(extractedTypes.keys()).join(',\n  ')},
  ${Array.from(helperTypes.keys()).join(',\n  ')},
};
`;

  return content;
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('📖 读取源文件:', SOURCE_FILE);

    // 创建 TypeScript 项目
    const project = new Project({
      tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
    });

    // 添加源文件
    const sourceFile = project.addSourceFileAtPath(SOURCE_FILE);

    console.log('\n🔍 分析 naimo 对象结构...');

    // 分析 naimo 对象
    const naimoStructure = analyzeNaimoObject(sourceFile);

    console.log('📊 发现以下 API 模块:');
    Object.keys(naimoStructure).forEach(key => {
      const structure = naimoStructure[key];
      if (structure.type === 'object') {
        const methodCount = Object.keys(structure.methods).length;
        console.log(`  - ${key}: ${methodCount} 个方法 (${structure.comment})`);
      } else {
        console.log(`  - ${key}: ${structure.type} (${structure.comment})`);
      }
    });

    console.log('\n🔍 递归提取所有依赖类型...');

    // 提取所有使用的类型
    const extractedTypes = extractUsedTypes(naimoStructure, project);
    console.log(`📦 成功提取 ${extractedTypes.size} 个依赖类型`);

    // 显示提取的类型
    if (extractedTypes.size > 0) {
      console.log('   提取的类型:', Array.from(extractedTypes.keys()).join(', '));
    }

    // 获取辅助类型（包括 UBrowser）
    const helperTypes = getPluginHelperTypes(project);
    console.log(`🔧 添加 ${helperTypes.size} 个插件辅助类型`);

    console.log('\n✍️  生成类型声明...');

    // 生成类型声明
    const content = generateTypeDeclaration(naimoStructure, extractedTypes, helperTypes);

    // 确保输出目录存在
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');

    console.log('\n✅ 类型声明文件生成成功！');
    console.log(`📄 输出路径: ${OUTPUT_FILE}`);
    console.log(`📊 文件大小: ${(content.length / 1024).toFixed(2)} KB`);
    console.log(`📝 总行数: ${content.split('\n').length}`);
    console.log(`📦 类型统计: ${extractedTypes.size} 个依赖类型 + ${helperTypes.size} 个辅助类型`);
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行
main();
