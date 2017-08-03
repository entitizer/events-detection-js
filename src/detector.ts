
const debug = require('debug')('events-detection');
import { Callback, PlainObject, _, isEntityType } from './utils';
import { DataTemplate, DataTemplateFilter, getTemplates } from './data';
const atonic = require('atonic');

export interface NamedEntity {
    id: string
    name: string
    abbr?: string
    type?: 'PERSON' | 'LOCATION' | 'ORG'
}

export type NamedEntityInfo = {
    index: number
    entity: NamedEntity
}

export type DetectParams = {
    lang: string
    text: string
    entities?: NamedEntityInfo[]
}

export type Event = {
    id: string
    title: string
    precision: number
    entities?: NamedEntity[]
}

export function detect(params: DetectParams, cb: Callback<Event[]>): void {
    getTemplates(params.lang, (error, templates) => {
        if (error) {
            return cb(error);
        }
        const text = params.text;
        const atonicText = atonic(text);
        const events: Event[] = [];
        for (let i = 0; i < templates.length; i++) {
            try {
                const event = extractEvent(text, atonicText, templates[i], params.entities);
                if (event) {
                    events.push(event);
                }
            } catch (e) {
                return cb(e);
            }
        }
        cb(null, events);
    });
}

function extractEvent(originalText: string, atonicText: string, template: DataTemplate, entities?: NamedEntityInfo[]): Event {
    if (template.params && Object.keys(template.params).length && (!entities || !entities.length)) {
        throw new Error('named entities are required!');
    }

    let event: Event = null;
    for (let i = 0; i < template.filters.length; i++) {
        const filter = template.filters[i];
        const reg = new RegExp(filter.regex, 'i');
        debug('reg', reg);
        const text = filter.atonic ? atonicText : originalText;
        // debug('text', text);
        const regResult = reg.exec(text);
        if (regResult) {
            debug('pass reg: ' + regResult[0]);
            const aEvent = formatEvent(regResult, template, filter, entities);
            if (aEvent) {
                if (aEvent.precision === 1) {
                    return aEvent;
                }
                event = event && event.precision >= aEvent.precision ? event : aEvent;
            }
        }
    }

    return event;
}

function formatEvent(regResult: RegExpExecArray, template: DataTemplate, filter: DataTemplateFilter, entities: NamedEntityInfo[]): Event {
    const event: Event = { id: template.id, title: template.title, precision: filter.precision };

    const filterParamsCount = Object.keys(filter.params || {}).length;

    if (regResult.length !== filterParamsCount + 1) {
        throw new Error('Invalid data filter: ' + filter.regex);
    }

    if (filterParamsCount === 0) {
        debug('filterParamsCount=0');
        return event;
    }

    const params: PlainObject<NamedEntity> = {};

    for (let i = 1; i < regResult.length; i++) {
        const value = regResult[i];
        const name = filter.params[i];
        const index = regResult.index + regResult[0].indexOf(value);
        const param = findParam(name, template, entities, index, index + value.length);
        if (param) {
            params[name] = param.entity;
            event.title = formatText(event.title, name, param.entity);
        } else {
            debug(`Not found entity of type ${template.params[name].type} in: '${value}'`);
            return null;
        }
    }

    event.entities = Object.keys(params).map(key => params[key]);

    return event;
}

function findParam(name: string, template: DataTemplate, entities: NamedEntityInfo[], minIndex: number, maxIndex: number) {
    debug('find param', name, minIndex, maxIndex);
    const p = template.params[name];
    if (!p) {
        throw new Error('Invalid param name: ' + name);
    }
    return _.find(entities, item => item.index >= minIndex && item.index < maxIndex && isEntityType(p.type, item.entity.type));
}


function formatText(text: string, name: string, entity: NamedEntity) {
    const reg = new RegExp('\\${' + name + '}', 'g');
    return text.replace(reg, entity.abbr || entity.name);
}