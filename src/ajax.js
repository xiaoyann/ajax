/**
 * ajax.js v1.1.0 
 * https://github.com/striverx/ajax
 * 参考 jQuery 1.11-stable <https://github.com/jquery/jquery/tree/1.11-stable>
 * Date: 2015/10/06
 */

;(function(window) {

    'use strict';

    /**
     * 约定：假设当前作用域是全局作用域，以 _ 开头的变量(不包括函数)表示是全局的
     */
    
    var // 基本配置
        _options = {
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
            // 是否需要处理data参数
            processData: true,
            // 超时时间(毫秒)
            timeout: 0,
            // 是否允许浏览器缓存
            cache: true,
            // 是否跨越
            crossDomain: false,
            // 回调执行上下文
            context: null,
            // 请求发送前调用此函数，函数返回false将取消发送这个请求
            beforeSend: null,
            // 过滤请求结果
            dataFilter: null,
            // 请求成功后调用此函数
            success: null,
            // 请求失败后调用此函数
            error: null,
            // 请求完成后，无论成功还是失败，都将调用此函数
            complete: null,
            // 响应HTTP访问认证请求的用户名
            username: null,
            // 响应HTTP访问认证请求的密码
            password: null
        },
        _transports = {},
        // 匹配所有资源类型，这样写是为了避免被构建工具干掉
        _allType = '*/' + '*',
        // copy from the jQuery 用于将URL的各个组成部分匹配到一个数组
        _rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
        // 当前页面URL的组成部分
        _pParts = _rurl.exec(document.URL.toLowerCase()) || [],
        // 
        _isLocal = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(_pParts[1]),
        // 检测属性是否属于自己
        hasOwnProp = Object.prototype.hasOwnProperty;


    function ajax(opts) {

        var 
            transport,
            timeoutTimer, 
            reqHeaders = {}, 
            deferred = new Deferred(),
            options = mergeOptions(mergeOptions({}, _options), opts);

        // 调用 beforeSend

        deferred.success(options.success).error(options.error).always(options.complete);
        
        // 纠正 method
        options.method = ((options.method || 'GET') + '').toUpperCase();

        // 纠正URL 
        options.url = (options.url + '').replace(/^\/\//, _pParts[1] + '//');

        // 检测是否跨域
        if (options.crossDomain !== true) {
            options.crossDomain = isCrossDomain(options.url);
        }

        // 发送 GET/HEAD 请求时，把要提交的数据放在 url query 上
        options.hasContent = !/^(?:GET|HEAD)/.test(options.method);

        // 纠正 dataType
        options.dataType = (options.dataType + '').toLowerCase();

        // 将 data 格式化为 string
        var reqData = options.data;
        if (options.processData && reqData && typeof reqData !== 'string') {
            options.data = serializeData(options.data);
        }

        var reqUrl;
        if (!options.hasContent) {
            reqUrl = options.url
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

        // q=0.01 表示权重，数字越小权重越小
        var accept = options.accepts[options.dataType];
        reqHeaders.Accept = accept ? accept + ', '+ _allType +'; q=0.01' : _allType;

        if (options.hasContent && options.data && options.contentType) {
            reqHeaders['Content-Type'] = options.contentType;
        }

        options.headers = mergeOptions(reqHeaders, options.headers);

        transport = getTransport(options);

        if (transport) {
            
            var dummyXHR = transport.send(options, done);

            if (options.timeout > 0 && options.async) {
                timeoutTimer = setTimeout(function() {
                    dummyXHR.abort(function(param) {
                        done(0, 'timeout', '', param);
                    });
                }, options.timeout);
            }

        } else {
            done(-1, 'No transport');
        }

        function done(status, statusText, response, xhr) {

            var isSuccess, error;

            // 要尽早 clear 定时器
            clearTimeout(timeoutTimer);

            timeoutTimer = transport = undefined;

            isSuccess = status >= 200 && status < 300 || status === 304;

            if (response) {
                response = convertResponse(response, options, xhr);
            }

            if (isSuccess) {

                if (status === 204 || options.method === 'HEAD') {
                    statusText = 'nocontent';
                } else if (status === 304) {
                    statusText = 'notmodified';
                }

                deferred.resolve(options.context, [response, statusText, xhr]);

            } else {

                deferred.reject(options.context, [xhr, statusText, error]);
            }
        }

        return {
            success: function(callback) {
                deferred.success(callback);
            },
            error: function(callback) {
                deferred.error(callback);
            },
            always: function(callback) {
                deferred.always(callback);
            }
        };
    }

    /**
     * [setOptions 用于设置全局选项]
     */
    ajax.setOptions = function(opt) {
        return mergeOptions(_options, opt);
    };

    //
    _transports = {
        xhr: {
            send: function(options, callback) {

                var xhr = options.createXHR(), onReady,
                    reqHeaders = options.headers;

                xhr.open(options.method, options.url, options.async, options.username, options.password);

                if (!options.crossDomain) {
                    reqHeaders['X-Requested-With'] = 'XMLHttpRequest';
                }

                // 设置 request header
                for (var name in reqHeaders) {
                    if (reqHeaders[name] !== undefined) {
                        xhr.setRequestHeader(name, reqHeaders[name] + '');
                    }
                }

                // 因为服务器可能返回不正确的 mimeType，所以如果我们自己知道请求的内容类型就可以进行覆盖，
                // 让浏览器收到响应后使用我们自己设置的 mimeType 来解析
                if (xhr.overrideMimeType && (options.mimeType || reqHeaders.Accept !== _allType)) {
                    xhr.overrideMimeType(options.mimeType || reqHeaders.Accept.split(',')[0]);
                }

                onReady = function(event, isAbort) {
                    var status, statusText, response;

                    if (xhr.readyState === 4 || isAbort) {
                        if (isAbort) {
                            if (xhr.readyState !== 4) {
                                xhr.abort();
                            }

                        } else {

                            try {
                                statusText = xhr.statusText;
                            } catch(e) {
                                statusText = '';
                            }

                            if (typeof xhr.responseText === 'string') {
                                response = xhr.responseText;
                            }

                            if (!xhr.status && options.isLocal && !options.crossDomain) {
                               status = response ? 200 : 404;
                            } else {
                                // 如果 XHR 是使用 IE 的 ActiveXObject 创建的，报告204时会被设置成1223
                                status = xhr.status === 1223 ? 204 : xhr.status;
                            }

                            callback(status, statusText, response, xhr);
                        }

                        xhr.onreadystatechange = noop;
                        onReady = null;
                    }
                };
                
                if (!options.async) {
                    onReady();

                // 此处应该有解释    
                } else if(xhr.readyState === 4) {
                    setTimeout(onReady);

                } else {
                    xhr.onreadystatechange = onReady;
                }

                this.xhr = xhr;

                xhr.send((options.hasContent && options.data) || null);

                return {
                    abort: function(callback) {
                        onReady(undefined, true);
                        callback(xhr);
                    }
                };
            }
        }   
    };
    
    ajax.setOptions({
        // 内容类型，告诉XHR使用哪种数据类型解析返回结果
        mimeType: '',
        // 使用什么数据类型发送数据到服务器
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        // 内容类型，告诉服务器该请求接受哪种类型的返回结果
        accepts: {
            text: 'text/plain',
            html: 'text/html',
            xml: 'application/xml, text/xml',
            json: 'application/json, text/javascript',
            script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
        },
        // 配置不同类型内容对应的转换方式
        converters: {
            text: null,
            html: null,
            xml: parseXML,
            json: parseJSON,
            script: null
        }
    });

    // ajax.setOptions({
    //     // 指定jsonp的回调函数名称
    //     jsonp: 'jsonp',
    //     jsonpCallback: function() {}
    // });
    
    ajax.setOptions({
        // 当前页面是否是本地协议 copy from the jQuery
        isLocal: _isLocal,
        // IE7 虽然实现了 XMLHttpRequest，但是与标准的还是存在差异，不支持本地协议
        // 如果是在 IE7 下并且使用的本地协议，就直接使用非标准的 XHR，否则先尝试创建标准的 XHR，失败后再使用非标准的
        createXHR: window.ActiveXObject ? 
                ((_isLocal && /MSIE\s?(?:7)\.0/.test(navigator.userAgent)) || !createStandardXHR() ? createActiveXObjectXHR : createStandardXHR) 
            : createStandardXHR
    });

    /**
     * [Deferred 暂时简单点]
     */
    function Deferred() {
        this.doneCallbacks = [];
        this.failCallbacks = [];
        this.alwaysCallbacks = [];
    }

    Deferred.prototype = {
        constructor: Deferred,
        resolve: function(context, params) {
            execute(context, this.doneCallbacks.concat(this.alwaysCallbacks), params);
        },  
        reject: function(context, params) {
            execute(context, this.failCallbacks.concat(this.alwaysCallbacks), params);
        },
        always: function(callback) {
            if (typeof callback === 'function') {
                this.alwaysCallbacks.push(callback);
            }
            return this;
        },
        success: function(callback) {
            if (typeof callback === 'function') {
                this.doneCallbacks.push(callback);
            }
            return this;
        },
        error: function(callback) {
            if (typeof callback === 'function') {
                this.failCallbacks.push(callback);
            }
            return this;
        }
    };

    function execute(context, lists, params) {
        var callback;
        while ((callback = lists.shift()) !== undefined) {
            if (typeof callback === 'function') {
                callback.apply(context, params);
            }
        }
    }


    function getTransport(s) {
        return _transports[(s.dataType + '').toLowerCase()] || _transports.xhr;
    }

    // 空函数
    function noop() {}

    function convertResponse(response, s, xhr) {
        var converter, 
            dataType = s.dataType || s.mimeType || xhr.getResponseHeader('Content-Type') || '';
            
        converter = (dataType.match(/xml|json/) || [""])[0];
        converter = s.converters[converter];

        return typeof converter === 'function' ? converter(response) : response ;
    }

    /**
     * [parseJSON description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    function parseJSON(data) {
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data + '');
        }
        return (Function('return ' + data))();
    }

    /**
     * [parseXML description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    function parseXML(data) {
        var xmldom = null, errors = '';

        try {
            if (window.DOMParser) {
                xmldom = (new window.DOMParser()).parseFromString(data, 'text/xml');
                errors = xmldom.getElementsByTagName('parsererror');
            } else if (window.ActiveXObject) {
                xmldom = new window.ActiveXObject(getValidMSXMLVersion());
                xmldom.loadXML(data);
                errors = xmldom.parseError != 0 ? xmldom.parseError.reason : '';
            }
        } catch(e) { 
            xmldom = null; 
        }

        if (errors.length > 0) {
            xmldom = null;
        }

        return xmldom;
    }


    /**
     * [serializeData 序列化 data，参考 jQuery]
     * @param  {[type]} obj   [description]
     * @return {[string]}     [description]
     */
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

        } else {
            // 
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

    /**
     * [createStandardXHR 创建标准的XMLHttpRequest对象]
     */
    function createStandardXHR() {
        try {
            return new XMLHttpRequest();
        } catch(e) {}
    }

    /**
     * [createActiveXHR 创建非标准的XMLHttpRequest对象]
     */
    function createActiveXObjectXHR() {
        try {
            return new ActiveXObject(getValidMSXHRVersion());
        } catch(e) {}
    }

    /**
     * [getValidMSXHRVersion 在IE下获取可用的XHR版本标识]
     * @return {[string]} [description]
     */
    function getValidMSXHRVersion() {
        var validVersion = getValidMSXHRVersion.validVersion || '', xhr,
            versions = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Msxml2.XMLHTTP'];

        if (!validVersion) {
            while ((validVersion = versions.shift()) !== undefined) {
                try {
                    xhr = new window.ActiveXObject(validVersion);
                    getValidMSXHRVersion.validVersion = validVersion;
                    break;
                } catch(e) {
                    validVersion = '';
                }
             }
        }
        return validVersion;
    }

    /**
     * [getValidMSXMLVersion]
     * @return {[string]} [description]
     */
    function getValidMSXMLVersion() {
        var validVersion = getValidMSXMLVersion.validVersion || '', xmldom,
            versions = ['MSXML2.DOMDocument.6.0', 'MSXML2.DOMDocument.3.0', 'MSXML2.DOMDocument'];
        
        if (!validVersion) {
            while ((validVersion = versions.shift()) !== undefined) {
                try {
                    xmldom = new window.ActiveXObject(validVersion);
                    getValidMSXMLVersion.validVersion = validVersion;
                    break;
                } catch(e) {
                    validVersion = '';
                }
            }
        }

        return validVersion;
    }

    /**
     * [mergeOptions 合并选项]
     * 这里使用了 for in 来遍历数组，有问题吗？
     */
    function mergeOptions(target, source) {
        var key, val, tVal, isArr = isArray(target);

        for (key in source) {
            if (hasOwnProp.call(source, key)) {
                val = source[key];
                tVal = target[key];

                // val是对象
                if (isPlainObject(val)) {
                    target[key] = mergeOptions(tVal || {}, val);

                // val是数组
                } else if (isArray(val)) {
                    target[key] = mergeOptions(tVal || [], val);

                // otherwise
                } else if (val !== undefined) {
                    // 是数组时不要覆盖有值的索引
                    key = isArr ? target.length : key;
                    target[key] = val;
                }
            }
        }

        return target;
    }

    /**
     * [isPlainObject 还需要优化]
     * null 在IE8/7下使用 toString 会返回 [object Object]
     */
    function isPlainObject(obj) {
        return !!obj && Object.prototype.toString.call(obj) === '[object Object]';
    }

    /**
     * [isArray 还需要优化]
     */
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    /**
     * [isCrossDomain 检测跨域，参考jQuery]
     * @param  {[string]}  url [description]
     * @return {Boolean}     [description]
     */
    function isCrossDomain(reqUrl) {
        var rParts = _rurl.exec(reqUrl.toLowerCase());
        // 1:protocol, 2:domain, 3:port
        return !!rParts && (rParts[1] !== _pParts[1] || rParts[2] !== _pParts[2] || 
                (rParts[3] || (rParts[1] === 'http:' ? '80' : '443')) !== (_pParts[3] || (_pParts[1] === 'http:' ? '80' : '443')));
    }

    window.ajax = ajax;

})(this);





























