var through = require('through2');

var trimWhitespace = String.prototype.trim ? function(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.trim();
} : function(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/^\s+/, '').replace(/\s+$/, '');
};

function collapseWhitespaceAll(str) {
  return str && str.replace(/\s+/g, function(spaces) {
    return spaces === '\t' ? '\t' : spaces.replace(/(^|\xA0+)[^\xA0]+/g, '$1 ');
  });
}

function collapseWhitespace(str, options, trimLeft, trimRight, collapseAll) {
  var lineBreakBefore = '', lineBreakAfter = '';

  if (options.preserveLineBreaks) {
    str = str.replace(/^\s*?[\n\r]\s*/, function() {
      lineBreakBefore = '\n';
      return '';
    }).replace(/\s*?[\n\r]\s*$/, function() {
      lineBreakAfter = '\n';
      return '';
    });
  }

  if (trimLeft) {
    str = str.replace(/^\s+/, function(spaces) {
      var conservative = !lineBreakBefore && options.conservativeCollapse;
      if (conservative && spaces === '\t') {
        return '\t';
      }
      return spaces.replace(/^[^\xA0]+/, '').replace(/(\xA0+)[^\xA0]+/g, '$1 ') || (conservative ? ' ' : '');
    });
  }

  if (trimRight) {
    str = str.replace(/\s+$/, function(spaces) {
      var conservative = !lineBreakAfter && options.conservativeCollapse;
      if (conservative && spaces === '\t') {
        return '\t';
      }
      return spaces.replace(/[^\xA0]+(\xA0+)/g, ' $1').replace(/[^\xA0]+$/, '') || (conservative ? ' ' : '');
    });
  }

  if (collapseAll) {
    // strip non space whitespace then compress spaces to one
    str = collapseWhitespaceAll(str);
  }

  return lineBreakBefore + str + lineBreakAfter;
}

function collapseWhitespaceBetweenSpecialSymbol(str) {
    return str.replace(/([>\)}])\s+?([{\(<])/ig , "$1$2");
}

function collapseMultipleLine(str) {
    return str.replace(/([\n\r]+)/ig , "\n");
};

module.exports = function(options) {
    options = options || {};

    return through.obj(function(file, encoding, callback) {
        var str = '';
        var compressTemplated = "";
        try {
            var str = file.contents.toString();
        } catch(error) {
            throw new Error("Can not get file content:", error);
            return callback(error, null);
        }

        if (options.only_juicer_template) {
            /** Get juicer tempalte from serial tempalte. **/
            var juicerTemplateRegexp = /<script.+?type=\"text\/x-juicer-template\".*?>[\s\S]*?<\/script>/ig;
            var templateStrArr = str.match(juicerTemplateRegexp);
            if (!templateStrArr) {
                callback(null, file);
                return;
            } else {
                console.log("%d templates found.", templateStrArr.length);
            }
            /** remove those juicer template from the original tempalte **/
            str = str.replace(juicerTemplateRegexp , function(juicerTemplate) {
                return "";
            });

            /** filter juicer tempaltes **/
            templateStrArr = templateStrArr.map(function(juicerTemplate){
                juicerTemplate = collapseWhitespace(juicerTemplate, {
                    preserveLineBreaks: true,
                    conservativeCollapse: true,
                }, true, true, true);
                juicerTemplate = collapseWhitespaceBetweenSpecialSymbol(juicerTemplate);

                return juicerTemplate;
            });

            compressTemplated = templateStrArr.join("");
        }

        str = collapseMultipleLine(str);

        file.contents = new Buffer(compressTemplated?[str, compressTemplated].join("\n\r"):str);
        console.log("deflating process finished!");
        callback(null, file);
    });
};
