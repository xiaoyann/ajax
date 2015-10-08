/**
 * ajax.js v1.1.0 
 * https://github.com/striverx/ajax
 * 参考 jQuery 1.11-stable <https://github.com/jquery/jquery/tree/1.11-stable>
 * Date: 2015/10/06
 */

;(function(window) {

    'use strict';
    
    var // 基本配置
        _options = {},
        // 匹配所有资源类型，这样写是为了避免被构建工具干掉
        _allType = '*/' + '*',
        // IE 下使用 AcitveXObject 创建 XHR 的版本标记
        msValidXHRTag,
        // copy from the jQuery 用于将URL的各个组成部分分割到一个数组
        rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
        // 当前页面URL的组成部分
        pParts = rurl.exec(document.URL.toLowerCase()) || [],
        // 检测属性是否属于自己
        hasOwnProp = Object.prototype.hasOwnProperty;
        

    
    /**
     * [ajax description]
     * @param  {[object]} opt [description]
     * @return {[type]}       [description]
     */
    function ajax(opt) {

        var // XMLHttpRequest 实例
            xhr,
            // 合并选项
            options = mergeOptions(mergeOptions({}, _options), opt),
            // 请求是否需要提交数据
            needSendData,
            // request headers
            reqHeaders = {},
            // 超时定时器
            timeoutTimer;

        // 纠正 method
        options.method = ((options.method || 'GET') + '').toUpperCase();

        // 纠正URL 
        options.url = (options.url + '').replace(/^\/\//, pParts[1] + '//');

        // 检测是否跨域
        if (options.crossDomain !== true) {
            options.crossDomain = isCrossDomain(options.url);
        }

        // 发送 GET/HEAD 请求时，把要提交的数据放在 url query 上
        needSendData = !/^(?:GET|HEAD)/.test(options.method);

        // 纠正 dataType
        var dataType = (options.dataType + '').toLowerCase();
        options.dataType = options.accepts[dataType] ? dataType : '*';

        // 将 data 格式化为 string
        var reqData = options.data;
        if (options.processData && reqData && typeof reqData !== 'string') {
            options.data = serializeData(options.data);
        }

        if (!needSendData) {
            var reqUrl = options.url;
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

        xhr = options.createXHR();

        xhr.open(options.method, options.url, options.async, options.username, options.password);

        // 设置 Accept
        var accept = options.accepts[options.dataType];
        reqHeaders.Accept = accept.indexOf(_allType) === -1 ? accept + ', '+ _allType +'; q=0.01' : accept;

        // 设置 Content-Type
        if (needSendData && options.data && options.contentType) {
            reqHeaders['Content-Type'] = options.contentType;
        }

        // 添加Ajax标识 X-Requested-With
        if (!options.crossDomain) {
            reqHeaders['X-Requested-With'] = 'XMLHttpRequest';
        }

        // 设置 Request Headers
        mergeOptions(reqHeaders, options.headers);
        for (var hName in reqHeaders) {
            if (reqHeaders[hName] !== undefined) {
                xhr.setRequestHeader(hName, reqHeaders[hName] + '');
            }
        }

        // 覆盖 mimeType
        if (xhr.overrideMimeType && (options.mimeType || reqHeaders.Accept !== _allType)) {
            xhr.overrideMimeType(options.mimeType || reqHeaders.Accept.split(',')[0]);
        }

        // 请求超时后取消请求，同步请求不用设置超时处理
        if (options.timeout > 0 && options.async) {
            timeoutTimer = setTimeout(function() {
                xhr.abort();
            }, options.timeout);
        }

        xhr.onreadystatechange = function() {
            // alert(xhr.readyState + '--' + xhr.status);
        };

        xhr.send((needSendData && options.data) || null);
    }

    /**
     * [setOptions description]
     * @param  {[type]} opt [description]
     * @return {[type]}     [description]
     */
    ajax.setOptions = function(opt) {
        return mergeOptions(_options, opt);
    };

    ajax.setOptions({
        // 请求地址
        url: '',
        // 请求方法
        method: 'GET',
        // 请求参数
        data: null,
        // 是否异步
        async: true,
        // 请求头
        headers: null,
        // 内容类型，告诉XHR使用哪种数据类型解析返回结果
        mimeType: '',
        // 使用什么数据类型发送数据到服务器
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        // 是否需要处理data参数
        processData: true,
        // 超时时间(毫秒)
        timeout: 0,
        // 是否允许浏览器缓存
        cache: true,
        // 以哪种数据类型解析返回结果
        dataType: null,
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
        // 指定jsonp的回调函数名称
        jsonp: 'jsonp',
        jsonpCallback: function() {},
        // 响应HTTP访问认证请求的用户名
        username: null,
        // 响应HTTP访问认证请求的密码
        password: null
    });
    
    ajax.setOptions({
        // 内容类型，告诉服务器该请求接受哪种类型的返回结果
        accepts: {
            '*': _allType,
            text: 'text/plain',
            html: 'text/html',
            xml: 'application/xml, text/xml',
            json: 'application/json, text/javascript',
            script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
        }
    });
    
    ajax.setOptions({
        // 当前页面是否是本地协议 copy from the jQuery
        isLocal: /^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(pParts[1]),
        // IE7 虽然实现了 XMLHttpRequest，但是与标准的还是存在差异，不支持本地协议
        // 如果是在 IE7 下并且使用的本地协议，就直接使用非标准的 XHR，否则先尝试创建标准的 XHR，失败后再使用非标准的
        createXHR: window.ActiveXObject ? 
                ((this.isLocal && /MSIE\s?(?:7)\.0/.test(navigator.userAgent)) || createStandardXHR() ? createActiveXObjectXHR : createStandardXHR) 
            : createStandardXHR
    });

    /**
     * [serializeData 参考 jQuery]
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
            value = isFunction(value) ? value() : (value == null ? '' : value) ;
            s.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));   
        }

        return s.join('&').replace(/%20/g, '+');
    }

    /**
     * [createStandardXHR 创建标准的XMLHttpRequest对象]
     * @return {[type]} [description]
     */
    function createStandardXHR() {
        try {
            return new XMLHttpRequest();
        } catch(e) {}
    }

    /**
     * [createActiveXHR 创建非标准的XMLHttpRequest对象]
     * @return {[type]} [description]
     */
    function createActiveXObjectXHR() {
        if (!msValidXHRTag) {
            msValidXHRTag = getValidMSXHRTag();
        }
        try {
            return new ActiveXObject(msValidXHRTag);
        } catch(e) {}
    }

    /**
     * [getValidMSXHRTag 在IE下获取可用的XHR版本标识]
     * @return {[type]} [description]
     */
    function getValidMSXHRTag() {
        var msValidXHRTag, xhr,
            msXHRTags = ['Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0', 'Msxml2.XMLHTTP'];

        while ((msValidXHRTag = msXHRTags.shift()) !== undefined) {
            try {
                xhr = new window.ActiveXObject(msValidXHRTag);
            } catch(e) {}
            
            if (xhr) { 
                xhr = null; break; 
            } else {
                msValidXHRTag = undefined;
            }
        }
        return msValidXHRTag;
    }

    /**
     * [mergeOptions 合并选项]
     * 这里使用了 for in 来遍历数组，有问题吗？
     * @param  {[type]} target [description]
     * @param  {[type]} source [description]
     * @return {[type]}        [description]
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
     * @param  {[type]}  obj [description]
     * @return {Boolean}     [description]
     */
    function isPlainObject(obj) {
        return !!obj && Object.prototype.toString.call(obj) === '[object Object]';
    }

    /**
     * [isArray 还需要优化]
     * @param  {[type]}  obj [description]
     * @return {Boolean}     [description]
     */
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    /**
     * [isFunction 检测是否是函数]
     * @param  {[type]}  obj [description]
     * @return {Boolean}     [description]
     */
    function isFunction(obj) {
        return typeof obj === 'function';
    }

    /**
     * [isCrossDomain 参考jQuery]
     * @param  {[string]}  url [description]
     * @return {Boolean}     [description]
     */
    function isCrossDomain(reqUrl) {
        //  reqUrl parts 需要去请求的URL的组成部分 
        var rParts = rurl.exec(reqUrl.toLowerCase());

        // 1:protocol, 2:domain, 3:port
        return !!rParts && (rParts[1] !== pParts[1] || rParts[2] !== pParts[2] || 
                (rParts[3] || (rParts[1] === 'http:' ? '80' : '443')) !== (pParts[3] || (pParts[1] === 'http:' ? '80' : '443')));
    }

    window.ajax = ajax;

})(this);





























