(function(root, factory) {
    if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        exports.ajax = factory();
    } else {
        root.ajax = factory();
    }
})(window, function () {
    'use strict';

    // 实例化 XMLHttpRequest
    function createXHR() {
        return new window.XMLHttpRequest();
    }

    // 提取 URL 的协议、域名、端口
    function pathInfo(url) {
        return /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/.exec(url.toLowerCase()) || [];
    }

    // 检测 reqUrl 是否跨域
    function isCrossDomain(reqUrl) {
        let rParts = pathInfo(reqUrl);
        let pParts = pathInfo(document.URL);
        // 1:protocol, 2:domain, 3:port
        return !!rParts && (rParts[1] !== pParts[1] || rParts[2] !== pParts[2] || 
                (rParts[3] || (rParts[1] === 'http:' ? '80' : '443')) !== (pParts[3] || (pParts[1] === 'http:' ? '80' : '443')));
    }

    // 检测 url 是否是本地协议
    function isLocal(url) {
        return /^(?:about|app|app-storage|.+-extension|file|res|widget):/.test(url);
    }

    function extend(target, source) {
        for (let key in source) {
            let copy = source[key];
            if (copy && typeof copy === 'object') {
                target[key] = extend(target[key] || {}, copy);
            } else {
                target[key] = copy;
            }
        }
        return target;
    }

    function serializeData(obj) {
        var s = [];
        
        if (isArray(obj)) {
            for (var i = 0; i < obj.length; i++) {
                add(obj[i].name, obj[i].value);
            }
        } else if (isPlainObject(obj)) {
            for (var name in obj) {
                serialize(name, obj[name]);
            }
        }

        function serialize(prefix, obj) {
            if (isArray(obj)) {
                for (var i = 0; i < obj.length; i++) {
                    serialize(prefix + '[' + (typeof obj[i] === 'object' ? i : '') +']', obj[i]);
                }
            } else if (isPlainObject(obj)) {
                for (var name in obj) {
                    serialize(prefix + '['+ name +']', obj[name]);
                }
            } else {
                add(prefix, obj);
            }
        }

        function add(name, value) {
            value = isFunction(value) ? value() : (value == null ? '' : value);
            s.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));   
        }

        return s.join('&').replace(/%20/g, '+');
    }

    function isPlainObject(obj) {
        return obj && Object.prototype.toString.call(obj) === '[object Object]';
    }

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    function empty() {}

    // 转换 response
    function ajaxConvert(response, s, xhr) {
        var converter, dataType = s.dataType || s.mimeType || xhr.getResponseHeader('Content-Type') || '';
        converter = (dataType.match(/xml|json/) || [""])[0];
        converter = s.converters[converter];
        return typeof converter === 'function' ? converter(response) : response ;
    }

    function parseJSON(data) {
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data + '');
        }
        return (Function('return ' + data))();
    }


    // 默认设置
    const defaultOptions = {
        // 请求地址
        url: '',
        // 请求方法
        method: 'GET',
        // 请求参数
        data: null,
        // 是否异步
        async: true,
        // 自定义请求首部
        headers: null,
        // 以哪种数据类型解析返回结果
        dataType: '',
        // 超时时间(毫秒)
        timeout: 0,
        // 是否允许浏览器缓存
        cache: true,
        // 是否跨越
        crossDomain: false, 
        // 回调执行上下文
        context: null,
        // 请求成功后调用此函数
        success: null,
        // 请求失败后调用此函数
        error: null,
        // 请求完成后，无论成功还是失败，都将调用此函数
        complete: null,
        // 内容类型，告诉XHR使用哪种数据类型解析返回结果
        mimeType: '',
        // 使用什么数据类型发送数据到服务器
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        // 内容类型，告诉服务器该请求接受哪种类型的返回结果
        accepts: {
            text: 'text/plain',
            html: 'text/html',
            json: 'application/json, text/javascript'
        },
        xhr: createXHR,
        // 配置不同类型内容对应的转换方式
        converters: {
            text: null,
            html: null,
            json: parseJSON
        },
        beforeSend: null
    };


    function send(options, callback) {
    
        var xhr = options.xhr(), headers = options.headers;
        
        xhr.open(options.method, options.url, options.async);
        
        // 因为服务器可能返回不正确的 mimeType，所以如果我们自己知道请求的内容类型就可以进行覆盖，
        // 让浏览器收到响应后使用我们自己设置的 mimeType 来解析
        if (xhr.overrideMimeType && (options.mimeType || headers.Accept !== '*/*'))
            xhr.overrideMimeType(options.mimeType || headers.Accept.split(',')[0]);

        if (!options.crossDomain) headers['X-Requested-With'] = 'XMLHttpRequest';

        for (var name in headers) {
            if (typeof headers[name] !== 'undefined') 
                xhr.setRequestHeader(name, headers[name] + '');
        }

        xhr.send((options.hasContent && options.data) || null);
        
        function abort() {
            if (xhr.readyState !== 4) xhr.abort;
        }
        
        function onReadyStateChange() {
            var status, statusText, response;

            if (onReadyStateChange && xhr.readyState === 4) {
                onReadyStateChange = undefined;
                xhr.onreadystatechange = empty;

                // see https://github.com/jquery/jquery/blob/1.12-stable/src/ajax/xhr.js#L148-153
                if (typeof xhr.responseText === 'string') response = xhr.responseText;

                // see https://github.com/jquery/jquery/blob/1.12-stable/src/ajax/xhr.js#L155-163
                try {
                    statusText = xhr.statusText;
                } catch(e) {
                    statusText = '';
                }

                // see https://github.com/jquery/jquery/blob/1.12-stable/src/ajax/xhr.js#L167-176
                if (!xhr.status && isLocal(document.URL) && !options.crossDomain) {
                   status = response ? 200 : 404;
                } else {
                    status = xhr.status === 1223 ? 204 : xhr.status;
                }

                callback(status, statusText, response, xhr);
            }
        }
        
        // 同步模式直接调用
        if (!options.async) {
            onReadyStateChange();

        // see https://github.com/jquery/jquery/blob/1.12-stable/src/ajax/xhr.js#L195-197
        } else if(xhr.readyState === 4) {
            setTimeout(onReadyStateChange);

        } else {
            xhr.onreadystatechange = onReadyStateChange;
        }

        return abort;
    }


    // 
    function ajax(options) {

        // 超时定时器
        var timeoutTimer, 
            reqHeaders = {},
            callbackContext = options.context,
            hasDone = false;

        options = extend(extend({}, defaultOptions), options);

        // 纠正 method，未指定 method 默认设置为 GET
        options.method = ((options.method || 'GET') + '').toUpperCase();

        // 将 // 替换成当前页面所使用的协议
        options.url = (options.url + '').replace(/^\/\//, window.location.protocol + '//');

        // 检测是否跨域
        if (options.crossDomain !== true) options.crossDomain = isCrossDomain(options.url);

        // 格式化 data
        if (options.data && typeof options.data !== 'string') options.data = serializeData(options.data);

        // 发送 GET/HEAD 请求时，把要提交的数据放在 url query 上
        options.hasContent = !/^(?:GET|HEAD)/.test(options.method);

        if (!options.hasContent) {
            var reqUrl = options.url
            // 将 data 追加到 url 的 query 上
            if (options.data) {
                reqUrl += (reqUrl.indexOf('?') > -1 ? '&' : '?') + options.data;
                delete options.data;
            }
            // 添加时间戳来禁止缓存
            if (options.cache === false) {
                reqUrl += (reqUrl.indexOf('?') > -1 ? '&' : '?') + '_=' + +(new Date());
            }
            options.url = reqUrl;
        }

        // 纠正 dataType
        options.dataType = (options.dataType + '').toLowerCase();

        // 根据 dataType 设置 Accept，默认使用 allType
        // q=0.01 表示权重，数字越小权重越小
        var allType = '*/' + '*';
        var accept = options.accepts[options.dataType];
        reqHeaders.Accept = accept ? accept + ', '+ allType +'; q=0.01' : allType;

        // 设置 Content-Type
        if (options.hasContent && options.data && options.contentType) reqHeaders['Content-Type'] = options.contentType;

        options.headers = extend(reqHeaders, options.headers);

        if (options.beforeSend && options.beforeSend.call(callbackContext, options) === false) {
            return done(0, 'beforeSend canceled');
        }

        function done(status, statusText, response, xhr) {
            var isSuccess, error;
            
            if (hasDone === true) return;
            hasDone = true;
                
            clearTimeout(timeoutTimer);
            timeoutTimer = undefined;
            
            isSuccess = status >= 200 && status < 300 || status === 304;
            
            if (isSuccess) {
                if (response) {
                    try {
                        response = ajaxConvert(response, options, xhr);
                    } catch(e) {
                        error = e;
                        isSuccess = false;
                    }
                }
                if (status === 204 || options.method === 'HEAD') {
                    statusText = 'nocontent';
                } else if (status === 304) {
                    statusText = 'notmodified';
                }
            } else {
                error = statusText;
            }

            if (isSuccess) {
                if (options.success) options.success.call(callbackContext, response, statusText, xhr)
            } else {
                if (options.error) options.error.call(callbackContext, error, statusText, xhr);
            }

            if (options.complete) options.complete.call(callbackContext);

            done = null;
        }

        var _abort = send(options, done);

        function abort() {
            _abort();
            done(0, 'abort');
        }

        if (options.timeout > 0 && options.async) timeoutTimer = setTimeout(abort, options.timeout);

        return abort;
    }

    return ajax;
});










