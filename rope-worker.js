'use strict';
importScripts('./rope-core.js?v=20261031');
self.onmessage=function(e){try{self.postMessage({id:e.data.id,plan:RopeCore.plan(e.data.expression)});}catch(error){self.postMessage({id:e.data.id,error:error.message});}};
