import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, MousePointer, Code, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SelectorCaptureToolProps {
  onSelectorCaptured: (selector: string, type: 'css' | 'xpath') => void;
}

// Bookmarklet code that users can drag to their bookmarks bar
const BOOKMARKLET_CODE = `javascript:(function(){
  if(window.__selectorMode){window.__selectorMode.stop();return;}
  var style=document.createElement('style');
  style.id='selector-helper-style';
  style.textContent='.__selector-highlight{outline:3px solid #3b82f6!important;outline-offset:2px!important;cursor:crosshair!important;}.__selector-overlay{position:fixed;top:10px;right:10px;background:#1e293b;color:#fff;padding:16px;border-radius:8px;z-index:999999;font-family:system-ui;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.3);}.__selector-overlay button{background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin:4px;}.__selector-overlay button:hover{background:#2563eb;}.__selector-overlay pre{background:#0f172a;padding:8px;border-radius:4px;overflow-x:auto;font-size:12px;margin:8px 0;}';
  document.head.appendChild(style);
  
  var overlay=document.createElement('div');
  overlay.className='__selector-overlay';
  overlay.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>Selector Capture</strong><button id="__close-selector">✕</button></div><div id="__selector-info">Click on any element to capture its selector</div><div id="__selector-result" style="display:none;"><pre id="__css-selector"></pre><button id="__copy-css">Copy CSS Selector</button></div>';
  document.body.appendChild(overlay);
  
  var currentEl=null;
  
  function getSelector(el){
    if(el.id)return'#'+el.id;
    var path=[];
    while(el&&el.nodeType===1){
      var selector=el.nodeName.toLowerCase();
      if(el.id){path.unshift('#'+el.id);break;}
      if(el.className&&typeof el.className==='string'){
        var classes=el.className.trim().split(/\\s+/).filter(function(c){return c&&!c.startsWith('__selector');}).slice(0,2);
        if(classes.length)selector+='.'+classes.join('.');
      }
      var parent=el.parentNode;
      if(parent){
        var siblings=Array.from(parent.children).filter(function(s){return s.nodeName===el.nodeName;});
        if(siblings.length>1){
          var idx=siblings.indexOf(el)+1;
          selector+=':nth-of-type('+idx+')';
        }
      }
      path.unshift(selector);
      el=parent;
    }
    return path.join(' > ');
  }
  
  function onMouseOver(e){
    if(e.target.closest('.__selector-overlay'))return;
    if(currentEl)currentEl.classList.remove('__selector-highlight');
    currentEl=e.target;
    currentEl.classList.add('__selector-highlight');
  }
  
  function onClick(e){
    if(e.target.closest('.__selector-overlay'))return;
    e.preventDefault();
    e.stopPropagation();
    var sel=getSelector(currentEl);
    document.getElementById('__css-selector').textContent=sel;
    document.getElementById('__selector-result').style.display='block';
    document.getElementById('__selector-info').textContent='Selector captured! Copy and paste into Lovable.';
  }
  
  function copySelector(){
    var sel=document.getElementById('__css-selector').textContent;
    navigator.clipboard.writeText(sel).then(function(){
      alert('Selector copied: '+sel);
    });
  }
  
  function stop(){
    document.removeEventListener('mouseover',onMouseOver,true);
    document.removeEventListener('click',onClick,true);
    if(currentEl)currentEl.classList.remove('__selector-highlight');
    var style=document.getElementById('selector-helper-style');
    if(style)style.remove();
    overlay.remove();
    window.__selectorMode=null;
  }
  
  document.addEventListener('mouseover',onMouseOver,true);
  document.addEventListener('click',onClick,true);
  document.getElementById('__close-selector').onclick=stop;
  document.getElementById('__copy-css').onclick=copySelector;
  window.__selectorMode={stop:stop};
})();`;

export function SelectorCaptureTool({ onSelectorCaptured }: SelectorCaptureToolProps) {
  const [manualSelector, setManualSelector] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopied(true);
    toast.success('Bookmarklet code copied! Create a new bookmark and paste this as the URL.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUseSelector = () => {
    if (!manualSelector.trim()) {
      toast.error('Please enter a selector');
      return;
    }
    // Detect if it's XPath or CSS
    const isXpath = manualSelector.trim().startsWith('/') || manualSelector.trim().startsWith('(');
    onSelectorCaptured(manualSelector.trim(), isXpath ? 'xpath' : 'css');
    setManualSelector('');
    toast.success('Selector added!');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MousePointer className="w-4 h-4 text-primary" />
          Element Selector Tool
        </CardTitle>
        <CardDescription>
          Easily capture CSS selectors from any webpage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bookmarklet Instructions */}
        <div className="p-3 rounded-lg bg-accent/30 border border-accent space-y-3">
          <p className="text-sm font-medium">Quick Selector Capture (Recommended)</p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Copy the bookmarklet code below</li>
            <li>Create a new bookmark in your browser</li>
            <li>Paste the code as the bookmark URL</li>
            <li>Navigate to your product page</li>
            <li>Click the bookmark to activate selection mode</li>
            <li>Click on elements to capture their CSS selectors</li>
            <li>Copy the selector and paste it below</li>
          </ol>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyBookmarklet}
            className="w-full"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Code className="w-4 h-4 mr-2" />
                Copy Bookmarklet Code
              </>
            )}
          </Button>
        </div>

        {/* Manual Selector Input */}
        <div className="space-y-2">
          <Label htmlFor="selector-input">Paste Captured Selector</Label>
          <div className="flex gap-2">
            <Input
              id="selector-input"
              value={manualSelector}
              onChange={(e) => setManualSelector(e.target.value)}
              placeholder="Paste CSS selector or XPath here..."
              className="font-mono text-sm flex-1"
            />
            <Button onClick={handleUseSelector} size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Use
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports both CSS selectors (e.g., .product-image img) and XPath (e.g., //img[@class='main'])
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
