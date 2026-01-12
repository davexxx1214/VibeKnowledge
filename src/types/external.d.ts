declare module 'mammoth' {
    interface ExtractRawTextOptions {
        path: string;
    }

    interface ExtractRawTextResult {
        value?: string;
        messages: Array<{
            type: string;
            message: string;
        }>;
    }

    function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;

    const mammoth: {
        extractRawText: typeof extractRawText;
    };

    export = mammoth;
}

declare module 'word-extractor' {
    interface WordDocument {
        getBody(): string | undefined;
        getHeaders(): Record<string, string>;
        getFootnotes(): string | undefined;
        getEndnotes(): string | undefined;
    }

    class WordExtractor {
        constructor();
        extract(filePath: string): Promise<WordDocument>;
    }

    export = WordExtractor;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
    import pdfParse = require('pdf-parse');
    export = pdfParse;
}

