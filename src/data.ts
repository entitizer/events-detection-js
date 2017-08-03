
import { readdir, readFileSync } from 'fs';
import { join } from 'path';
import { Callback, PlainObject } from './utils';
const CACHE: PlainObject<DataTemplate[]> = {};

export type DataTemplateFilter = {
    precision: number
    atonic?: boolean
    regex: string
    params?: PlainObject<string>
}

export type DataTemplate = {
    title: string
    params?: PlainObject<{ type: string }>
    filters: DataTemplateFilter[]
}

export function getTemplates(lang: string, cb: Callback<DataTemplate[]>): void {
    if (!CACHE[lang]) {
        getFileTemplates(lang, (error, data) => {
            if (error) {
                return cb(error);
            }
            CACHE[lang] = data;
            cb(null, CACHE[lang]);
        });
    } else {
        cb(null, CACHE[lang]);
    }
}

function getFileTemplates(lang: string, cb: Callback<DataTemplate[]>): void {
    if (typeof lang !== 'string' || !/^[a-z]{2}$/.test(lang)) {
        return cb(new Error('Invalid `lang` param'));
    }
    const dir = join(__dirname, '..', 'data', lang);
    readdir(dir, (error, files) => {
        if (error) {
            return cb(error);
        }
        const templates: DataTemplate[] = []
        for (var i = 0; i < files.length; i++) {
            const file = join(dir, files[i]);
            try {
                const content = readFileSync(file, 'utf8');
                const template = <DataTemplate>JSON.parse(content);
                templates.push(template);
            } catch (e) {
                return cb(e);
            }
        }

        cb(null, templates);
    });
}
