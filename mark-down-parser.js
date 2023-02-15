const katex = require('katex');
const showdown = require('showdown');


converter = new showdown.Converter(),
    text      = '# hello, markdown!',
    html      = converter.makeHtml(text);

module.exports = class MarkDownParser {
    constructor(){
        this.converter = new showdown.Converter({
            parseImgDimension : true,
            noHeaderId: true,
            simplifiedAutoLink: true,
        });
    }

    parseMarkdown(markdownText) {
        let regex = /\$(.*?)\$|([^$]+)/g;
        let replaced = markdownText.replace(regex, (_, group1, group2) => {
            if (group1) {
                // If group1 is defined, then the match was between $ and $
                return katex.renderToString(group1, { throwOnError: false, trust: true });
            } else {
                // Otherwise, the match was outside $ and $ so parse with showdown js
                return this.converter.makeHtml(group2);
            }
        });

        return replaced;

    }

}