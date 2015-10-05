// 待增加功能
// 1. jsonp
var ajax = (function(window) {

    var config = {
        // 
        accepts: {
            text: 'text/plain',
            html: 'text/html',
            xml: 'application/xml, text/xml',
            json: 'application/json, text/javascript'
        },

        // 不考虑IE6的情况下可以直接使用XMLHttpRequest，因为IE从IE7起就已实现了XMLHttpRequest
        createXHR: window.ActiveObject !== undefined ?
            function() {
                return createStandardXHR() || createActiveXHR()
            } : createStandardXHR,
        
        // 将data转换成字符串
        queryString: function(data) {
            var ret = []
            if (typeof ret === 'object') {
                for (var key in data) {
                    ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
                }
            }
            return ret.join('&')
        }
    }

    function parseJSON(data) {
        if (window.JSON) {
            return JSON.parse(data)
        } else {
            return (new Function('return '+ data))()
        }
    }

    return function(options) {

        var xhr = config.createXHR(), 

        url = options.url || window.location.href,

        method = (options.type || 'GET').toUpperCase(),

        queryString = config.queryString(options.data),

        mimeType = config.accepts[options.dataType],

        requestHeaders = {}

        if (mimeType) {
            requestHeaders['Accept'] = mimeType    
            if (mimeType.indexOf(',') > -1) {
                mimeType = mimeType.split(',')[0]
            }
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType(mimeType)
            }
        }       

        // POST请求需要设置requestHeader
        if (method === 'POST') {    
            requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
        } 
        // 标识这是一个ajax请求
        requestHeaders['X-Requested-With'] = 'XMLHttpRequest'

        // 如果是GET请求，将数据拼到URL上，并将queryString置空
        if (method === 'GET') {
            url += (url.indexOf('?') > -1 ? '&' : '?') + queryString
            queryString = null
        }

        // xhr.onreadystatechange
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var status = xhr.status
                if ((status >= 200 && status < 300) || status === 304) {
                    var resp = xhr.responseText, dataType = mimeType || xhr.getResponseHeader('content-type')

                    if (dataType === 'application/json') {
                        resp = parseJSON(resp)
                    } else if (/^(?:text|application)\/xml/.test(dataType)) {
                        resp = xhr.responseXML
                    }

                    if (typeof options.success === 'function') {
                        options.success(resp, xhr)
                    }

                } else {
                    if (typeof options.error === 'function') {
                        options.error(xhr)
                    }
                }
            }
        }

        // xhr.open
        xhr.open(method, url)

        // 设置headers
        for (var name in requestHeaders) {
            xhr.setRequestHeader(name, requestHeaders[name])
        }

        // xhr.send
        xhr.send(queryString)
    }

    function createStandardXHR() {
        try {
            return new XMLHttpRequest()
        } catch(e) {}
    }

    function createActiveXHR() {
        try {
            return new window.ActiveXObject('Microsoft.XMLHTTP')
        } catch(e) {}
    }

})(window)


/**
ajax({
    url: './demo.php',
    type: 'get',
    data: {a: 'aa', b: 'bb'},
    dataType: 'json',
    success: function(resp) {
        console.log(resp)
    },
    error: function(resp) {
        console.log(resp)
    }
})
*/








