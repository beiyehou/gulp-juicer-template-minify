var through = require('through2');

module.exports = function(options) {
    options = options || {};

    return through.obj(function(file, encoding, callback) {
        var str = '';
        try {
            var str = file.contents.toString();
        } catch(error) {
            throw new Error("Can not get file content:", error);
            return callback(error, null);
        }

        var juicerTemplateRegexp = /<script[\s]+type=\"text\/x-juicer-template\">.*?<\/script>/ig;
        var templateStrArr = str.match(juicerTemplateRegexp);
        console.log(templateStrArr);

        if (str) {
            str = str.replace(/(\s+)/gm," ");
        }

        if (options.removeTrailing) {
            str = str.replace(/[ \t]+$/gm, function() {
                return '';
            });
        }

        if (options.removeLeading) {
            str = str.replace(/^[ \t]+/gm, function() {
                return '';
            });
        }

        file.contents = new Buffer(str);
        callback(null, file);
    });
};
