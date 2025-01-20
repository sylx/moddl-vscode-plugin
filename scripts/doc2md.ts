import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';

interface ConversionResult {
  processedFiles: number;
  outputFile: string;
}

interface ProcessedFile {
  originalPath: string;
  id: string;
  content: string;
  links: LinkInfo[];
}

interface LinkInfo {
  originalHref: string;
  targetFile: string;
  text: string;
  lineNumber: number;
}

class HTMLProcessor {
  private turndownService: TurndownService;
  private processedFiles: Map<string, ProcessedFile>;
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.processedFiles = new Map();
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '***',  // 水平線のマーカーを変更
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      blankReplacement: (content, node) => {
        return '';
      }
    });

    // スクリプトとスタイルを除去するルール
    this.turndownService.addRule('removeScripts', {
      filter: ['script', 'style'],
      replacement: () => ''
    });
  }

  private normalizeFilePath(href: string, baseFile: string): string {
    const basePath = path.dirname(baseFile);
    return path.normalize(path.join(basePath, href));
  }

  private getFileIdForLink(filePath: string): string {
    return path.basename(filePath, '.html')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
  }

  private async extractLinksFromHTML(dom: JSDOM, filePath: string): Promise<LinkInfo[]> {
    const links: LinkInfo[] = [];
    
    dom.window.document.querySelectorAll('a').forEach((anchor, index) => {
      const href = anchor.getAttribute('href');
      if (!href) return;

      // ページ内リンク（#で始まるもの）は除外
      if (href.startsWith('#')) return;

      // 外部リンクは保持
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return;
      }

      // HTMLファイルへのリンクのみ処理
      if (href.endsWith('.html')) {
        const absolutePath = this.normalizeFilePath(href, filePath);
        links.push({
          originalHref: href,
          targetFile: absolutePath,
          text: anchor.textContent || href,
          lineNumber: index
        });
      }
    });

    return links;
  }

  async processFile(filePath: string): Promise<ProcessedFile> {
    // ファイルが既に処理済みの場合はキャッシュを返す
    if (this.processedFiles.has(filePath)) {
      return this.processedFiles.get(filePath)!;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const dom = new JSDOM(content);
    const links = await this.extractLinksFromHTML(dom, filePath);
    
    // HTMLをMarkdownに変換し、先頭の不要な見出しや空白を除去
    let markdown = this.turndownService.turndown(content);
    // 最初の見出しまで削除
    markdown = markdown.replace(/^.+?\#/ms, '#');
    
    const processed: ProcessedFile = {
      originalPath: filePath,
      id: this.getFileIdForLink(filePath),
      content: markdown,
      links: links
    };

    this.processedFiles.set(filePath, processed);
    return processed;
  }

  private async processAllLinkedFiles(initialFile: string): Promise<Set<string>> {
    const processedFiles = new Set<string>();
    const filesToProcess = [initialFile];

    while (filesToProcess.length > 0) {
      const currentFile = filesToProcess.pop()!;
      if (processedFiles.has(currentFile)) continue;

      try {
        const processed = await this.processFile(currentFile);
        processedFiles.add(currentFile);

        // 新しく見つかったリンクを処理キューに追加
        for (const link of processed.links) {
          if (!processedFiles.has(link.targetFile)) {
            filesToProcess.push(link.targetFile);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not process file ${currentFile}:`, error);
      }
    }

    return processedFiles;
  }

  private updateLinksInMarkdown(markdown: string, links: LinkInfo[]): string {
    let updatedMarkdown = markdown;
    
    // 各リンクを更新
    for (const link of links) {
      const targetId = this.getFileIdForLink(link.targetFile);
      const markdownLink = `[${link.text}](#${targetId})`;
      // 元のリンクをMarkdownの内部リンクに置き換え
      updatedMarkdown = updatedMarkdown.replace(
        new RegExp(`\\[${link.text}\\]\\(${link.originalHref}\\)`, 'g'),
        markdownLink
      );
    }
    return updatedMarkdown;
  }

  async convertToMarkdown(inputDir: string, outputFile: string): Promise<ConversionResult> {
    try {
      // 入力ディレクトリの検証
      const stats = await fs.stat(inputDir);
      if (!stats.isDirectory()) {
        throw new Error(`${inputDir} is not a directory`);
      }

      // HTMLファイルの検索
      const files = await fs.readdir(inputDir);
      const htmlFiles = files.filter(file => file.endsWith('.html'))
        .map(file => path.join(inputDir, file));

      if (htmlFiles.length === 0) {
        throw new Error(`No HTML files found in ${inputDir}`);
      }

      // すべてのリンク先ファイルを含めて処理
      const allProcessedFiles = new Set<string>();
      for (const file of htmlFiles) {
        const linkedFiles = await this.processAllLinkedFiles(file);
        linkedFiles.forEach(f => allProcessedFiles.add(f));
      }

      // 結合されたMarkdownの生成
      let combinedMarkdown = '';
      for (const filePath of allProcessedFiles) {
        const processed = await this.processFile(filePath);
        
        // アンカー要素の追加
        combinedMarkdown += `<a id="${processed.id}"></a>\n\n`;
        // 更新されたコンテンツの追加
        combinedMarkdown += this.updateLinksInMarkdown(processed.content, processed.links);
        combinedMarkdown += '\n\n---\n\n';
      }

      // 出力ディレクトリの作成
      await fs.mkdir(path.dirname(outputFile), { recursive: true });

      // 結果の保存
      await fs.writeFile(outputFile, combinedMarkdown.trim());
      console.log(`Conversion completed! Output saved to: ${outputFile}`);

      return {
        processedFiles: allProcessedFiles.size,
        outputFile: outputFile
      };
    } catch (error) {
      console.error('Conversion error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

// メイン実行部分
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: ts-node converter.ts <input directory> <output file>');
    console.error('Example: ts-node converter.ts ./html-files output.md');
    process.exit(1);
  }

  const [inputDirectory, outputFile] = args;

  try {
    const processor = new HTMLProcessor(inputDirectory);
    const result = await processor.convertToMarkdown(inputDirectory, outputFile);
    console.log(`Successfully processed ${result.processedFiles} files`);
  } catch (error) {
    console.error('Failed to convert files:', error);
    process.exit(1);
  }
}

main();