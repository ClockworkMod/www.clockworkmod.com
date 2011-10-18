function enumerate(arr) {
    var ret = {};
    for (var i in arr) {
        ret[arr[i]] = i;
    }
    return ret;
}

parse_state = enumerate([
'START',
'COMMA',
'COLON',
'DICTIONARY',
'TOKEN',
'TOKEN_ESCAPE',
'TOKEN_END',
'DICTIONARY_END',
'ARRAY',
'ARRAY_END',
'COMMENT_1',
'COMMENT',
'COMMENT_END'
]);

var dirty = {
    isWhitespace: function(c) {
        return c == '\n' || c == '\r' || c == '\t' || c == ' '
    },

    onArrayStart: function() {
        this.data += "["
    },

    onArrayEnd: function() {
        this.data += "]"
    },

    onDictStart: function() {
        this.data += "{"
    },

    onDictEnd: function() {
        this.data += "}"
    },

    onTokenEnd: function(s) {
        this.data += '"' + s + '"'
    },

    onComment: function() {
        return
    },

    onColon: function() {
        this.data += ":"
    },

    onComma: function() {
        this.data += ","
    },

    parse: function(contents) {
        this.data = '';
        var malformed = false;
        var token = ''
        var tokenstart = ''

        var state = parse_state.START

        // First let's try to parse it with simplejson.
        try {
            this.data = JSON.parse(contents)
            console.log('not malformed');
            return this.data;
        }
        catch(err) {
            malformed = true;
        }

        for (var i in contents) {
            var c = contents[i];
            if (state == parse_state.START) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == '[') {
                    state = parse_state.ARRAY
                    this.onArrayStart()
                }
                else if (c == '{') {
                    state = parse_state.DICTIONARY
                    this.onDictStart()
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after start:" + c
                }
            }
            else if (state == parse_state.ARRAY) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == ']') {
                    state = parse_state.ARRAY_END
                    this.onArrayEnd()
                }
                else if (c == '{') {
                    state = parse_state.DICTIONARY
                    this.onDictStart()
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    state = parse_state.TOKEN
                    token = c
                    tokenstart = ''
                }
                else if (c == '"' || c == "'") {
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after array start: " + c
                }
            }
            else if (state == parse_state.ARRAY_END) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == ']') {
                    state = parse_state.ARRAY_END
                    this.onArrayEnd()
                }
                else if (c == '}') {
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after array end:" + c
                }
            }
            else if (state == parse_state.DICTIONARY) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == ']') {
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    state = parse_state.TOKEN
                    tokenstart = ''
                    token = c
                }
                else if (c == '"' || c == "'") {
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after dictionary start: " + c;
                }
            }
            else if (state == parse_state.DICTIONARY_END) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == ']') {
                    state = parse_state.ARRAY_END
                    this.onArrayEnd()
                }
                else if (c == '}') {
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after dictionary end: " + c
                }
            }

            else if (state == parse_state.TOKEN) {
                if (c == tokenstart) {
                    state = parse_state.TOKEN_END
                    this.onTokenEnd(token)
                }
                else if (tokenstart == '' && c == '}') {
                    state = parse_state.DICTIONARY_END
                    this.onTokenEnd(token)
                    this.onDictEnd()
                }
                else if (tokenstart == '' && c == ':') {
                    state = parse_state.COLON
                    this.onTokenEnd(token)
                    this.onColon()
                }
                else if (tokenstart == '' && c == ',') {
                    state = parse_state.COMMA
                    this.onTokenEnd(token)
                }
                else if (c == '\n' || c == '\r') {
                    state = parse_state.TOKEN_END
                    this.onTokenEnd(token)
                }
                else if (c == '\\') {
                    state = parse_state.TOKEN_ESCAPE
                }
                else if (c == '\t') {
                    c += '\\t'
                }
                else {
                    token += c
                }
            }
            else if (state == parse_state.TOKEN_ESCAPE) {
                token += '\\' + c
                state = parse_state.TOKEN
            }

            else if (state == parse_state.TOKEN_END) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == ']') {
                    state = parse_state.ARRAY_END
                    this.onArrayEnd()
                }
                else if (c == '}') {
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == ':') {
                    state = parse_state.COLON
                    this.onColon()
                }
                else if (tokenstart == '' && c == ',') {
                    state = parse_state.COMMA
                    this.onTokenEnd(token)
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    state = parse_state.TOKEN
                    tokenstart = ''
                    token = c
                }
                else if (c == '"' || c == "'") {
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after token end: " + c
                }
            }
            else if (state == parse_state.COMMA) {
                if (this.isWhitespace(c)) {
                    continue
                }
                if (c == ']') {
                    // eat trailing commas
                    malformed = true
                    state = parse_state.ARRAY_END
                    this.onArrayEnd()
                    continue
                }
                if (c == '}') {
                    // eat trailing commas
                    malformed = true
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                    continue
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    this.onComma()
                    state = parse_state.TOKEN
                    tokenstart = ''
                    token = c
                }
                else if (c == '"' || c == "'") {
                    this.onComma()
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == '/') {
                    this.onComma()
                    state = parse_state.COMMENT_1
                }
                else if (c == '[') {
                    this.onComma()
                    this.onArrayStart()
                    state = parse_state.ARRAY
                }
                else if (c == '{') {
                    this.onComma()
                    this.onDictStart()
                    state = parse_state.DICTIONARY
                }
                else {
                    throw "Unknown token after comma: " + c
                }
            }

            else if (state == parse_state.COLON) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    state = parse_state.TOKEN
                    tokenstart = ''
                    token = c
                }
                else if (c == '"' || c == "'") {
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else if (c == '[') {
                    this.onArrayStart()
                    state = parse_state.ARRAY
                }
                else if (c == '{') {
                    this.onDictStart()
                    state = parse_state.DICTIONARY
                }
                else {
                    throw "Unknown token after colon: " + c
                }
            }

            else if (state == parse_state.COMMENT_1) {
                if (c == '/') {
                    state = parse_state.COMMENT
                }
                else {
                    throw "Expected comment, but found: " + c
                }
            }

            else if (state == parse_state.COMMENT) {
                malformed = true
                if (c == '\n' || c == '\r') {
                    state = parse_state.COMMENT_END
                    this.onComment
                }
            }

            else if (state == parse_state.COMMENT_END) {
                if (this.isWhitespace(c)) {
                    continue
                }
                else if (c == '[') {
                    state = parse_state.ARRAY
                    this.onArrayStart()
                }
                else if (c == '{') {
                    state = parse_state.DICTIONARY
                    this.onDictStart()
                }
                else if (c == ']') {
                    state = parse_state.DICTIONARY_END
                    this.onDictEnd()
                }
                else if (c.match(/[\w\d]/)) {
                    malformed = true
                    state = parse_state.TOKEN
                    tokenstart = ''
                    token = c
                }
                else if (c == '"' || c == "'") {
                    state = parse_state.TOKEN
                    token = ''
                    tokenstart = c
                }
                else if (c == ',') {
                    state = parse_state.COMMA
                }
                else if (c == '/') {
                    state = parse_state.COMMENT_1
                }
                else {
                    throw "Unknown token after dictionary start: " + c
                }
            }
        }
        this.result = JSON.parse(this.data);
        if (malformed)
            this.result.malformed = true;
        return this.result;
    }
}

exports.parse_state = parse_state;
exports.parse = function(c) {
  return dirty.parse(c);
}