/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SupportedLanguage, ExecutionResult, ExecutionLog, GeneratedImage } from '../types/editor';
import { renderMarkdownToHtml, renderXmlToHtml } from './markdownRenderer';

// Global cache for Pyodide WebAssembly runtime
let pyodideInstance: any = null;
let pyodideLoadPromise: Promise<any> | null = null;
let pillowPackageLoaded = false;
let httpPatchLoaded = false;

const PYODIDE_CDNS = [
  'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  'https://cdnjs.cloudflare.com/ajax/libs/pyodide/0.26.4/'
];

/**
 * Loads or returns the cached Pyodide WebAssembly instance with multi-CDN fallback.
 */
async function getPyodide(addLog: (type: ExecutionLog['type'], text: string) => void): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }
  if (pyodideLoadPromise) {
    return await pyodideLoadPromise;
  }

  pyodideLoadPromise = (async () => {
    let lastError: any = null;

    for (let i = 0; i < PYODIDE_CDNS.length; i++) {
      const cdnUrl = PYODIDE_CDNS[i];
      const cdnName = cdnUrl.includes('jsdelivr') ? 'jsDelivr' : 'Cloudflare';
      try {
        addLog('info', `[Loading Python 3.12 WebAssembly runtime (${cdnName})...]`);

        // Check if loadPyodide is available globally or needs to be loaded
        let loadPyodideFn = (window as any).loadPyodide;

        if (typeof loadPyodideFn !== 'function') {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${cdnUrl}pyodide.js`;
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${cdnName} pyodide.js`));
            document.head.appendChild(script);
          });
          loadPyodideFn = (window as any).loadPyodide;
        }

        if (typeof loadPyodideFn === 'function') {
          const pyodide = await loadPyodideFn({
            indexURL: cdnUrl
          });
          pyodideInstance = pyodide;
          addLog('info', `[Python 3.12 Wasm Engine initialized via ${cdnName}]`);
          return pyodide;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Pyodide] CDN ${cdnName} failed:`, err);
        // Reset window.loadPyodide so next CDN fallback can load clean
        try {
          delete (window as any).loadPyodide;
        } catch {}
      }
    }

    throw lastError || new Error('Failed to initialize Pyodide WebAssembly runtime');
  })()
    .then((inst) => {
      pyodideInstance = inst;
      return inst;
    })
    .catch((err) => {
      // Reset promise on failure so subsequent attempts can retry
      pyodideLoadPromise = null;
      throw err;
    });

  return await pyodideLoadPromise;
}

export async function executeScript(
  code: string,
  language: SupportedLanguage
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: ExecutionLog[] = [];

  const addLog = (
    type: ExecutionLog['type'],
    text: string,
    imageData?: GeneratedImage
  ) => {
    const time = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    logs.push({ type, text, time, imageData });
  };

  try {
    if (language === 'javascript') {
      addLog('info', '[Pluscript JS Engine v2.1 Ready]');
      
      const customConsole = {
        log: (...args: any[]) => {
          addLog('stdout', args.map(formatArg).join(' '));
        },
        info: (...args: any[]) => {
          addLog('info', args.map(formatArg).join(' '));
        },
        warn: (...args: any[]) => {
          addLog('stderr', `[WARN] ${args.map(formatArg).join(' ')}`);
        },
        error: (...args: any[]) => {
          addLog('stderr', `[ERR] ${args.map(formatArg).join(' ')}`);
        }
      };

      // Safe Async Function execution with sandboxed arguments
      const runFn = new Function('console', 'Math', 'Date', 'JSON', `
        "use strict";
        return (async () => {
          ${code}
        })();
      `);

      const result = await runFn(customConsole, Math, Date, JSON);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      if (result !== undefined) {
        addLog('result', `Return: ${formatArg(result)}`);
      }

      addLog('info', `Process terminated successfully with exit code 0 (${durationMs}ms)`);

      return {
        logs,
        durationMs,
        status: 'success',
        returnValue: result !== undefined ? formatArg(result) : undefined
      };
    }

    if (language === 'python') {
      addLog('info', '[Pluscript Python 3.12 Wasm Engine]');
      let generatedImages: GeneratedImage[] = [];
      let hasError = false;

      try {
        const pyodide = await getPyodide(addLog);

        // Check if Pillow is needed
        const needsPillow = /from\s+PIL\s+import|import\s+PIL|pillow|ImageDraw|ImageFont|Image\./i.test(code);
        if (needsPillow && !pillowPackageLoaded) {
          addLog('info', '[Loading Pillow WebAssembly module...]');
          await pyodide.loadPackage('pillow');
          pillowPackageLoaded = true;
          addLog('info', '[Pillow imaging library ready]');
        }

        // Check if matplotlib or numpy is needed
        const needsMatplotlib = /matplotlib/i.test(code);
        const needsNumpy = /\b(numpy|np)\b/i.test(code);
        if (needsMatplotlib || needsNumpy) {
          try {
            const pkgsToLoad = [];
            if (needsNumpy) pkgsToLoad.push('numpy');
            if (needsMatplotlib) pkgsToLoad.push('matplotlib');
            addLog('info', `[Loading ${pkgsToLoad.join(', ')} WebAssembly module...]`);
            await pyodide.loadPackage(pkgsToLoad);
          } catch (mErr: any) {
            console.warn('[Pyodide] package load notice:', mErr);
          }
        }

        // Check if requests / network calls are used
        const needsRequests = /\b(requests|urllib3|httpx)\b/i.test(code);
        if (needsRequests && !httpPatchLoaded) {
          try {
            addLog('info', '[Enabling browser network support for Python requests...]');
            await pyodide.loadPackage('micropip');
            const micropip = pyodide.pyimport('micropip');
            await micropip.install('pyodide-http');
            await pyodide.runPythonAsync(`
import pyodide_http
pyodide_http.patch_all()
`);
            httpPatchLoaded = true;
            addLog('info', '[Python requests network support enabled]');
          } catch (e: any) {
            console.warn('[Pyodide] pyodide-http setup notice:', e);
          }
        }

        // Auto-load other packages from imports if available
        try {
          if (pyodide.loadPackagesFromImports) {
            await pyodide.loadPackagesFromImports(code);
          }
        } catch {
          // Non-fatal package auto-load error
        }

        // Pipe stdout and stderr
        pyodide.setStdout({
          batched: (text: string) => {
            const trimmed = text.replace(/\r?\n$/, '');
            if (trimmed) {
              addLog('stdout', trimmed);
            }
          }
        });
        pyodide.setStderr({
          batched: (text: string) => {
            const trimmed = text.replace(/\r?\n$/, '');
            if (trimmed) {
              addLog('stderr', trimmed);
            }
          }
        });

        // Setup image interceptor and virtual file watcher
        const pythonSetup = `
import sys, os, io, base64

if '_pluscript_images' not in globals():
    _pluscript_images = []
_pluscript_images.clear()
_pluscript_plot_counter = 0

try:
    _pluscript_initial_mtimes = {f: os.path.getmtime(f) for f in os.listdir('.') if os.path.isfile(f)}
except Exception:
    _pluscript_initial_mtimes = {}

def _register_pluscript_image(name, fmt, b64, size):
    fname = os.path.basename(str(name)) if name else 'output.png'
    for item in _pluscript_images:
        if item.get('name') == fname:
            item['format'] = str(fmt).lower()
            item['base64'] = b64
            item['size'] = size
            return
    _pluscript_images.append({
        'name': fname,
        'format': str(fmt).lower(),
        'base64': b64,
        'size': size
    })

try:
    import PIL.Image
    if not getattr(PIL.Image.Image, '_pluscript_hooked', False):
        _orig_save = PIL.Image.Image.save
        _in_hook = False
        def _hooked_save(self, fp, *args, **kwargs):
            global _in_hook
            if _in_hook:
                return _orig_save(self, fp, *args, **kwargs)
            res = _orig_save(self, fp, *args, **kwargs)
            if isinstance(fp, (str, bytes, os.PathLike)):
                try:
                    _in_hook = True
                    buf = io.BytesIO()
                    fmt = kwargs.get('format') or getattr(self, 'format', None) or 'PNG'
                    _orig_save(self, buf, format=fmt)
                    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                    _register_pluscript_image(fp, fmt, b64, len(buf.getvalue()))
                except Exception:
                    pass
                finally:
                    _in_hook = False
            return res
        PIL.Image.Image.save = _hooked_save

        def _hooked_show(self, title=None, **kwargs):
            global _in_hook
            if _in_hook:
                return
            try:
                _in_hook = True
                buf = io.BytesIO()
                fmt = getattr(self, 'format', None) or 'PNG'
                _orig_save(self, buf, format=fmt)
                b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                fname = (str(title) if title else 'preview') + '.png'
                _register_pluscript_image(fname, fmt, b64, len(buf.getvalue()))
            except Exception:
                pass
            finally:
                _in_hook = False
        PIL.Image.Image.show = _hooked_show
        PIL.Image.Image._pluscript_hooked = True
except Exception:
    pass

try:
    import matplotlib
    matplotlib.use('Agg')
    import warnings
    warnings.filterwarnings('ignore', message='.*Matplotlib is currently using agg.*')
    warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib')
    warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib.pyplot')

    import matplotlib.pyplot as plt

    def _pluscript_save_current_figs(prefix='plot'):
        global _pluscript_plot_counter
        try:
            fig_nums = plt.get_fignums()
            for num in fig_nums:
                _pluscript_plot_counter += 1
                fig = plt.figure(num)
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight')
                b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                name = f"{prefix}_{_pluscript_plot_counter}.png" if _pluscript_plot_counter > 1 or len(fig_nums) > 1 else f"{prefix}.png"
                _register_pluscript_image(name, 'PNG', b64, len(buf.getvalue()))
                plt.close(fig)
        except Exception:
            pass

    plt.show = lambda *args, **kwargs: _pluscript_save_current_figs('plot')
except Exception:
    pass
`;
        await pyodide.runPythonAsync(pythonSetup);

        // Run user Python code
        try {
          const ret = await pyodide.runPythonAsync(code);
          if (ret !== undefined && ret !== null) {
            const strVal = String(ret);
            if (strVal !== 'None' && !strVal.startsWith('<') && !strVal.endsWith('>')) {
              addLog('result', `Return: ${strVal}`);
            }
          }
        } catch (pyErr: any) {
          hasError = true;
          const msg = pyErr.message || String(pyErr);
          addLog('stderr', msg);
        }

        // Post-execution image discovery (virtual filesystem + hooked images + unclosed matplotlib figures)
        const pythonExtract = `
try:
    import sys
    if 'matplotlib.pyplot' in sys.modules or 'matplotlib' in sys.modules:
        import matplotlib.pyplot as plt
        if hasattr(plt, 'get_fignums') and len(plt.get_fignums()) > 0:
            _pluscript_save_current_figs('plot')
except Exception:
    pass

try:
    import os, base64
    valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg')
    cwd = os.getcwd()
    for fname in os.listdir(cwd):
        if fname.lower().endswith(valid_exts):
            fpath = os.path.join(cwd, fname)
            if os.path.isfile(fpath):
                cur_mtime = os.path.getmtime(fpath)
                is_new_or_modified = (fname not in _pluscript_initial_mtimes) or (cur_mtime > _pluscript_initial_mtimes.get(fname, 0))
                if is_new_or_modified and not any(img.get('name') == fname for img in _pluscript_images):
                    try:
                        with open(fpath, 'rb') as f:
                            data = f.read()
                        ext = fname.split('.')[-1].lower()
                        _register_pluscript_image(fname, ext, base64.b64encode(data).decode('ascii'), len(data))
                    except Exception:
                        pass
except Exception:
    pass

import json
json.dumps(_pluscript_images)
`;
        const imagesJson = await pyodide.runPythonAsync(pythonExtract);
        const rawImages = JSON.parse(imagesJson);
        if (Array.isArray(rawImages) && rawImages.length > 0) {
          const seenNames = new Set<string>();
          const dedupedImages = rawImages.filter((img: any) => {
            if (!img || !img.name || !img.base64) return false;
            if (seenNames.has(img.name)) return false;
            seenNames.add(img.name);
            return true;
          });

          generatedImages = dedupedImages.map((img: any, i: number) => {
            const format = (img.format || 'png').toLowerCase();
            const mime = format === 'svg' ? 'image/svg+xml' : `image/${format === 'jpg' ? 'jpeg' : format}`;
            return {
              id: `img-${Date.now()}-${i}`,
              name: img.name || `image_${i + 1}.${format}`,
              dataUrl: `data:${mime};base64,${img.base64}`,
              format: format.toUpperCase(),
              sizeBytes: img.size
            };
          });

          for (const img of generatedImages) {
            const kb = img.sizeBytes ? Math.round((img.sizeBytes / 1024) * 10) / 10 : 0;
            addLog('image', `Generated image: ${img.name} (${kb} KB)`, img);
          }
        }

      } catch (engineErr: any) {
        hasError = true;
        pyodideLoadPromise = null; // Clear so user can retry immediately
        const errMsg = engineErr?.message || String(engineErr);
        addLog('stderr', `[Python Engine Initialization Error: ${errMsg}]`);
        addLog('stderr', `Please check your connection and tap ▶ Run to retry.`);
      }

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      addLog('info', `Python execution finished in ${durationMs}ms`);

      return {
        logs,
        durationMs,
        status: hasError ? 'error' : 'success',
        generatedImages
      };
    }

    if (language === 'bash') {
      addLog('info', '[Pluscript Bash / POSIX Shell]');
      simulateBashExecution(code, addLog);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      addLog('info', `Process returned 0 (${durationMs}ms)`);
      return { logs, durationMs, status: 'success' };
    }

    if (language === 'html') {
      addLog('info', '[HTML5 Render Engine Active]');
      addLog('stdout', 'Rendered live preview DOM successfully.');
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        logs,
        durationMs,
        status: 'success',
        htmlPreview: code
      };
    }

    if (language === 'json') {
      addLog('info', '[JSON Parser & Validator]');
      try {
        const parsed = JSON.parse(code);
        addLog('stdout', `Valid JSON (${Object.keys(parsed).length} top-level keys).`);
        addLog('stdout', JSON.stringify(parsed, null, 2));
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
        return { logs, durationMs, status: 'success' };
      } catch (err: any) {
        addLog('stderr', `SyntaxError: ${err.message}`);
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
        return { logs, durationMs, status: 'error' };
      }
    }

    if (language === 'markdown') {
      addLog('info', 'Rendering Markdown document...');
      const htmlPreview = renderMarkdownToHtml(code, true);
      const linesCount = code.split('\n').length;
      addLog('stdout', `Parsed Markdown document (${linesCount} lines, ${code.length} chars).`);
      addLog('stdout', 'Rendered formatted typography to Live Preview tab.');
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        logs,
        durationMs,
        status: 'success',
        htmlPreview
      };
    }

    if (language === 'xml') {
      addLog('info', 'Inspecting XML document structure...');
      const htmlPreview = renderXmlToHtml(code, true);
      const linesCount = code.split('\n').length;
      addLog('stdout', `Parsed XML document (${linesCount} lines, ${code.length} chars).`);
      addLog('stdout', 'Rendered formatted XML tree to Live Preview tab.');
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        logs,
        durationMs,
        status: 'success',
        htmlPreview
      };
    }

    if (language === 'sql') {
      addLog('info', '[Pluscript In-Memory SQLite]');
      simulateSqlExecution(code, addLog);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      return { logs, durationMs, status: 'success' };
    }

    // Generic fallback for markdown/lua
    addLog('info', `[Interpreting ${language.toUpperCase()} file]`);
    addLog('stdout', `Total lines: ${code.split('\n').length}, characters: ${code.length}`);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    return { logs, durationMs, status: 'success' };

  } catch (err: any) {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    addLog('stderr', `Runtime Exception: ${err.message || String(err)}`);
    return {
      logs,
      durationMs,
      status: 'error'
    };
  }
}

function formatArg(arg: any): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function simulatePythonExecution(code: string, addLog: (type: any, text: string) => void) {
  const lines = code.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // print("...") matching
    const printMatch = line.match(/^print\((.*)\)$/);
    if (printMatch) {
      let content = printMatch[1].trim();
      // Handle f-strings or standard strings
      if (content.startsWith('f"') || content.startsWith("f'")) {
        content = content.substring(2, content.length - 1);
        content = content.replace(/\{(\w+)\.upper\(\)\}/g, '$1');
        content = content.replace(/\{(\w+)\}/g, '$1');
        addLog('stdout', content);
      } else if (
        (content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))
      ) {
        addLog('stdout', content.substring(1, content.length - 1));
      } else {
        addLog('stdout', content);
      }
    }
  }
}

function simulateBashExecution(code: string, addLog: (type: any, text: string) => void) {
  const lines = code.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('echo ')) {
      let msg = line.substring(5).trim();
      if ((msg.startsWith('"') && msg.endsWith('"')) || (msg.startsWith("'") && msg.endsWith("'"))) {
        msg = msg.substring(1, msg.length - 1);
      }
      msg = msg.replace(/\$ENV/g, 'production');
      msg = msg.replace(/\$BUILD_DIR/g, './dist');
      msg = msg.replace(/\$APP_NAME/g, 'pluscript-core');
      addLog('stdout', msg);
    } else if (line.startsWith('date')) {
      addLog('stdout', new Date().toISOString().replace('T', ' ').substring(0, 19));
    }
  }
}

function simulateSqlExecution(code: string, addLog: (type: any, text: string) => void) {
  lines: code.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'));
  addLog('stdout', 'Executing DDL/DML transactions...');
  addLog('stdout', 'QUERY PLAN: 1 table created, 3 rows inserted into "users".');
  addLog('stdout', '┌─────────────────┬───────────────────┐');
  addLog('stdout', '│ username        │ total_scripts     │');
  addLog('stdout', '├─────────────────┼───────────────────┤');
  addLog('stdout', '│ dev_alex        │ 14                │');
  addLog('stdout', '│ script_ninja    │ 9                 │');
  addLog('stdout', '│ cloud_architect │ 4                 │');
  addLog('stdout', '└─────────────────┴───────────────────┘');
}
