/**
 * IPC 类型生成脚本
 * 自动从 TypeScript 文件中提取函数并生成接口声明
 */

import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 从 TypeScript 文件中提取函数并生成接口声明
 * @param {string} filePath TypeScript 文件的路径
 * @returns {string} 生成的接口声明字符串
 */
function generateInterfaceFromFunctions(filePath) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const functionDeclarations = sourceFile.getFunctions();

  if (functionDeclarations.length === 0) {
    return '// 文件中没有找到任何函数。';
  }

  const interfaceMembers = functionDeclarations.map(func => {
    const name = func.getName();
    const comment = func.getJsDocs().map(doc => doc.getDescription()).join(' ').trim();

    // 获取参数及其类型
    const params = func.getParameters().map(param => {
      const paramName = param.getName();
      const type = param.getTypeNode() ? param.getTypeNode().getText() : 'any';
      return `${paramName}: ${type}`;
    }).join(', ');

    // 获取返回类型
    const returnType = func.getReturnTypeNode() ? func.getReturnTypeNode().getText() : 'any';

    return `  /** ${comment || '无注释'} */\n  "${name}": (${params}) => ${returnType};`;
  }).join('\n\n');

  const interfaceName = path.basename(filePath, path.extname(filePath)) + 'Interface';

  return `interface ${interfaceName} {\n${interfaceMembers}\n}`;
}

/**
 * 将驼峰式转换为短横线格式
 * @param {string} str 驼峰式字符串
 * @returns {string} 短横线格式字符串
 */
function convertToKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * 将短横线格式转换为驼峰式
 * @param {string} str 短横线格式字符串
 * @returns {string} 驼峰式字符串
 */
function convertToCamelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 从类型字符串中提取使用的类型
 * @param {string} typeText 类型文本
 * @param {Map} availableImports 可用的导入
 * @param {Set} usedTypes 已使用的类型集合
 * @param {Map} externalImports 外部导入映射
 */
function extractUsedTypes(typeText, availableImports, usedTypes, externalImports) {
  if (!typeText || typeText === 'any') return;

  // 简单的类型提取逻辑，匹配大写字母开头的标识符
  const typeMatches = typeText.match(/\b[A-Z][a-zA-Z0-9]*\b/g);

  if (typeMatches) {
    typeMatches.forEach(typeName => {
      // 跳过内置类型
      if (['Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Function'].includes(typeName)) {
        return;
      }

      // 检查是否在可用导入中
      if (availableImports.has(typeName)) {
        usedTypes.add(typeName);
        const moduleSpecifier = availableImports.get(typeName);

        // 使用 Map 来避免重复导入，如果已存在则合并
        if (!externalImports.has(typeName)) {
          externalImports.set(typeName, moduleSpecifier);
        }
      }
    });
  }
}

/**
 * 扫描目录中的所有 TypeScript 文件并生成类型定义
 * @param {string} dirPath 目录路径
 * @param {string} outputPath 输出文件路径
 */
function generateTypesFromDirectory(dirPath, outputPath) {
  const project = new Project();
  const sourceFiles = project.addSourceFilesAtPaths(path.join(dirPath, '**/*.ts'));

  let allInterfaces = [];
  let allRoutes = [];
  let usedTypes = new Set(); // 收集实际使用的类型
  let externalImports = new Map(); // 使用 Map 来避免重复导入

  sourceFiles.forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    const relativePath = path.relative(dirPath, filePath);
    const moduleName = path.basename(filePath, '.ts');

    // 先收集所有导入的类型信息，但不立即添加到 externalImports
    const imports = sourceFile.getImportDeclarations();
    const availableImports = new Map(); // 存储可用的导入

    imports.forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const namedImports = importDecl.getNamedImports();

      namedImports.forEach(namedImport => {
        const importName = namedImport.getName();
        // 只收集从项目内部导入的类型（非 node_modules 和 electron）
        if (!moduleSpecifier.startsWith('electron') &&
          !moduleSpecifier.startsWith('node:') &&
          !moduleSpecifier.startsWith('@') &&
          !moduleSpecifier.includes('node_modules')) {

          // 计算从输出文件到源文件的相对路径
          const outputDir = path.dirname(outputPath);
          const sourceDir = path.dirname(filePath);
          const relativePath = path.relative(outputDir, sourceDir);

          // 处理相对路径，确保以正确的格式输出
          let adjustedModuleSpecifier;
          if (moduleSpecifier.startsWith('.')) {
            // 相对路径：需要从源文件目录开始计算
            const sourceRelativePath = path.join(relativePath, moduleSpecifier).replace(/\\/g, '/');
            // 使用 Node.js 的 path.resolve 来规范化路径
            const normalizedPath = path.resolve(outputDir, sourceRelativePath);
            const finalRelativePath = path.relative(outputDir, normalizedPath).replace(/\\/g, '/');
            adjustedModuleSpecifier = finalRelativePath.startsWith('.') ? finalRelativePath : './' + finalRelativePath;
          } else {
            // 绝对路径：直接使用
            adjustedModuleSpecifier = moduleSpecifier;
          }

          availableImports.set(importName, adjustedModuleSpecifier);
        }
      });
    });

    // 获取所有导出的函数
    const functions = sourceFile.getFunctions();
    const exportedFunctions = [];

    functions.forEach(func => {
      // 检查函数是否被导出
      const isExported = func.hasExportKeyword();

      if (isExported) {
        const functionName = func.getName();

        // 处理多行注释，提取完整的 JSDoc 信息
        const jsDocs = func.getJsDocs();
        let fullComment = '';
        let simpleComment = '';

        if (jsDocs.length > 0) {
          const doc = jsDocs[0]; // 通常每个函数只有一个 JSDoc

          // 获取主描述
          const description = doc.getDescription().trim();
          simpleComment = description; // 为 ROUTE_INFO 保留简单注释

          // 获取所有标签
          const tags = doc.getTags();
          const tagTexts = tags.map(tag => {
            const tagName = tag.getTagName();
            // 对于 JSDocTag，使用 getComment() 方法获取注释内容
            const tagComment = tag.getComment();
            // 如果标签有注释内容，则包含注释；否则只显示标签名
            return tagComment ? `@${tagName} ${tagComment}` : `@${tagName}`;
          });

          // 组合完整的注释
          const parts = [description, ...tagTexts].filter(part => part.length > 0);
          fullComment = parts.join('\n * ');
        }

        const cleanComment = fullComment || '无注释';
        const simpleCommentClean = simpleComment || '无注释';

        // 获取泛型类型参数，包括约束
        const typeParameters = func.getTypeParameters();
        let genericParams = '';

        if (typeParameters.length > 0) {
          genericParams = `<${typeParameters.map(tp => {
            const name = tp.getName();
            const constraint = tp.getConstraint();
            if (constraint) {
              let constraintText = constraint.getText();
              return `${name} extends ${constraintText}`;
            }
            return name;
          }).join(', ')}>`;
        }

        // 构建参数列表，包含泛型信息，并收集使用的类型
        const params = func.getParameters().map(param => {
          const paramName = param.getName();
          const isOptional = param.hasQuestionToken(); // 检查是否有 ? 标记
          const type = param.getTypeNode() ? param.getTypeNode().getText() : 'any';

          // 收集在参数类型中使用的类型
          extractUsedTypes(type, availableImports, usedTypes, externalImports);

          // 如果有可选标记，添加 ?
          const optionalMark = isOptional ? '?' : '';
          return `${paramName}${optionalMark}: ${type}`;
        }).join(', ');

        // 构建返回类型，包含泛型信息，并收集使用的类型
        const returnType = func.getReturnTypeNode() ? func.getReturnTypeNode().getText() : 'any';

        // 收集在返回类型中使用的类型
        extractUsedTypes(returnType, availableImports, usedTypes, externalImports);

        exportedFunctions.push({
          name: functionName,
          moduleName: moduleName,
          comment: cleanComment || '无注释',
          simpleComment: simpleCommentClean || '无注释',
          genericParams,
          params,
          returnType
        });
      }
    });

    if (exportedFunctions.length > 0) {
      // 生成接口
      const interfaceName = moduleName + 'Interface';
      const interfaceMembers = exportedFunctions.map(func => {
        const returnType = func.returnType?.startsWith('Promise<') ? func.returnType : `Promise<${func.returnType}>`;

        const key1 = convertToKebabCase(`${func.moduleName}-${func.name}`);
        // 构建函数签名，包含泛型参数
        const functionSignature1 = func.genericParams
          ? `"${key1}": <${func.genericParams.slice(1, -1)}>(${func.params}) => ${returnType}`
          : `"${key1}": (${func.params}) => ${returnType}`;

        // 格式化注释，支持多行
        const comment1 = func.comment.includes('\n')
          ? `/**\n * ${func.comment}\n */`
          : `/** ${func.comment} */`;
        const result1 = `  ${comment1}\n  ${functionSignature1};`;

        const key2 = convertToCamelCase(key1);
        const functionSignature2 = func.genericParams
          ? `"${key2}": <${func.genericParams.slice(1, -1)}>(${func.params}) => ${returnType}`
          : `"${key2}": (${func.params}) => ${returnType}`;

        // 格式化注释，支持多行
        const comment2 = func.comment.includes('\n')
          ? `/**\n * ${func.comment}\n */`
          : `/** ${func.comment} */`;
        const result2 = `  ${comment2}\n  ${functionSignature2};`;

        return `${result1}\n${result2}`;
      }).join('\n\n');

      allInterfaces.push(`interface ${interfaceName} {\n${interfaceMembers}\n}`);

      // 收集路由信息
      exportedFunctions.forEach(func => {
        allRoutes.push({
          route: convertToKebabCase(`${func.moduleName}-${func.name}`),
          commentAll: func.comment,
          comment: func.simpleComment.replace(/\n/g, ', ').replace(/\s+/g, ' '),
          module: func.moduleName,
          function: func.name
        });
      });
    }
  });

  // 生成导入语句，按模块分组以避免重复
  const importGroups = new Map();
  externalImports.forEach((moduleSpecifier, typeName) => {
    if (!importGroups.has(moduleSpecifier)) {
      importGroups.set(moduleSpecifier, []);
    }
    importGroups.get(moduleSpecifier).push(typeName);
  });

  const importStatements = Array.from(importGroups.entries())
    .map(([moduleSpecifier, typeNames]) =>
      `import { ${typeNames.join(', ')} } from '${moduleSpecifier}';`
    )
    .join('\n');

  // 不需要了，这样没有注释，不好
  const typeConversion = `
// 工具类型：将短横线分隔的键转换为驼峰式
type CapitalizeFirstLetter<S extends string> = S extends \`\${infer F}\${infer R}\` ? \`\${Uppercase<F>}\${R}\` : S;

type KebabToCamelCase<S extends string> = S extends \`\${infer First}-\${infer Rest}\`
  ? \`\${First}\${KebabToCamelCase<CapitalizeFirstLetter<Rest>>}\`
  : S;

type KebabKeysToCamelCase<T> = {
  [K in keyof T as K extends string ? KebabToCamelCase<K> : never]: T[K];
};

// 驼峰式命名的路由类型
export type CamelCaseIpcRoutes = KebabKeysToCamelCase<AllIpcRoutes>;

// 支持两种命名方式的路由类型
export type AllIpcRouter = CamelCaseIpcRoutes & AllIpcRoutes;
`

  // 生成完整的类型定义文件
  const typeDefinition = `/**
 * 自动生成的 IPC 类型定义
 * 生成时间: ${new Date().toISOString()}
 * 请勿手动修改此文件
 */

${importStatements ? `${importStatements}\n` : ''}
// 各个模块的接口定义
${allInterfaces.join('\n\n')}

// 合并所有 IPC 路由类型
export interface AllIpcRouter extends ${allInterfaces.map((_, index) => {
    // 从接口名称中提取模块名
    const interfaceName = allInterfaces[index].match(/interface (\w+)Interface/)?.[1];
    return interfaceName ? `${interfaceName}Interface` : `Module${index}Interface`;
  }).join(', ')} {}

// 路由信息类型
export interface RouteInfo {
  route: string;
  comment: string;
  module: string;
  function: string;
}

// 路由信息常量
export const ROUTE_INFO: RouteInfo[] = [
${allRoutes.map(route => `  {
    route: "${route.route}",
    comment: "${route.comment}",
    module: "${route.module}",
    function: "${route.function}"
  }`).join(',\n')}
];

// 路由键类型
export type IpcRouteKey = keyof AllIpcRouter;

// 获取路由参数类型
export type IpcRouteParams<T extends IpcRouteKey> = Parameters<AllIpcRouter[T]>;

// 获取路由返回类型
export type IpcRouteReturn<T extends IpcRouteKey> = ReturnType<AllIpcRouter[T]>;
`;

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(outputPath, typeDefinition, 'utf8');
  console.log(`✅ 类型定义已生成: ${outputPath}`);
  console.log(`📊 共生成 ${allRoutes.length} 个路由定义`);
}

// 主函数
function main() {
  const modulesDir = path.join(process.cwd(), 'src/main/ipc-router/modules');
  const outputPath = path.join(process.cwd(), 'src/shared/typings/ipc-routes.ts');

  console.log('🚀 开始生成 IPC 类型定义...');
  console.log(`📁 扫描目录: ${modulesDir}`);
  console.log(`📄 输出文件: ${outputPath}`);

  if (!fs.existsSync(modulesDir)) {
    console.error(`❌ 目录不存在: ${modulesDir}`);
    process.exit(1);
  }

  generateTypesFromDirectory(modulesDir, outputPath);
  console.log('✨ 类型生成完成！');
}

// 如果直接运行此脚本
if (import.meta.url.endsWith('generate-ipc-types.js')) {
  main();
}

export {
  generateInterfaceFromFunctions,
  generateTypesFromDirectory
};