
const debug = require('debug')('events-detection');
import { Callback, PlainObject, _, isEntityType, StringPlainObject } from './utils';
import { DataTemplate, DataTemplateFilter, getTemplates, DataTemplatePredicate } from './data';
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
    predicate: DataTemplatePredicate
    precision: number
    data?: PlainObject<NamedEntity>
}

export function detect(params: DetectParams, cb: Callback<Event[]>): void {
    getTemplates(params.lang, (error, templates) => {
        if (error) {
            return cb(error);
        }
        const text = params.text;
        const atonicText = atonic(text);
        let events: Event[] = [];
        for (let i = 0; i < templates.length; i++) {
            try {
                const list = eventsFromTemplate(text, atonicText, templates[i], params.entities);
                if (list) {
                    events = events.concat(list);
                }
            } catch (e) {
                return cb(e);
            }
        }
        cb(null, events);
    });
}

// process template

function eventsFromTemplate(originalText: string, atonicText: string, template: DataTemplate, entities?: NamedEntityInfo[]): Event[] {
    if (template.data && Object.keys(template.data).length && (!entities || !entities.length)) {
        throw new Error('named entities are required!');
    }

    let events: Event[] = [];
    for (let i = 0; i < template.filters.length; i++) {
        const filter = template.filters[i];
        const text = filter.atonic ? atonicText : originalText;

        events = events.concat(eventsFromFilter(text, template, filter, entities));
    }

    return events;
}

function eventsFromFilter(text: string, template: DataTemplate, filter: DataTemplateFilter, entities: NamedEntityInfo[]): Event[] {
    const regs = (Array.isArray(filter.regex) ? filter.regex : [filter.regex]).map(item => new RegExp(item, 'i'));

    const regResults: RegExpExecArray[] = [];

    for (let i = 0; i < regs.length; i++) {
        const reg = regs[i];
        const regResult = reg.exec(text);
        if (!regResult) {
            return [];
        }
        regResults.push(regResult);
    }

    // find data in regex result
    if (filter.data) {
        return eventsFromRegexData(regResults, template, filter, entities);
    }

    // find data in entities
    return eventsFromEntities(template, filter, entities);
}

function eventsFromEntities(template: DataTemplate, filter: DataTemplateFilter, entities: NamedEntityInfo[]): Event[] {
    const names = Object.keys(template.data);
    const entitiesByType: PlainObject<NamedEntityInfo[]> = {};
    const typeNames = Object.keys(template.data).reduce<PlainObject<string[]>>((result, name) => {
        const type = template.data[name].type;
        if (!entitiesByType[type]) {
            entitiesByType[type] = _.filter(entities, item => isEntityType(type, item.entity.type));
        }
        result[type] = result[type] || [];
        result[type].push(name);
        return result;
    }, {});

    debug('typeNames', typeNames);

    const types = Object.keys(typeNames);

    const events: Event[] = [];
    let hasData = true;
    let lastIds: string[] = [];
    const typeIndexes: PlainObject<number> = {};

    while (hasData) {
        const data: PlainObject<NamedEntity> = {};
        const event: Event = { id: template.id, title: template.title, precision: filter.precision, predicate: template.predicate, data: data };
        const ids: string[] = [];
        for (let ti = 0; ti < types.length; ti++) {
            const type = types[ti];
            if (typeIndexes[type] === undefined) {
                typeIndexes[type] = 0;
            }
            debug('type index', type, typeIndexes[type]);
            const names = typeNames[type];
            for (let ni = 0; ni < names.length; ni++) {
                const name = names[ni];
                if (typeIndexes[type] < entitiesByType[type].length) {
                    const param = entitiesByType[type][typeIndexes[type]];
                    data[name] = param.entity;
                    event.title = formatText(event.title, name, param.entity);
                    ids.push(param.entity.id);
                } else {
                    hasData = false;
                    debug('no more entities of type ', type);
                }
            }
            typeIndexes[type]++;
        }
        if (ids.length === 0) {
            debug('not found any ids!');
            hasData = false;
        }
        // if got same data:
        if (lastIds.join(',') === ids.join(',')) {
            debug('data same ids');
            hasData = false;
        }
        lastIds = ids;
        if (hasData) {
            debug('has data: ', data);
            events.push(event);
        }
    }

    return events;
}

function eventsFromRegexData(regResults: RegExpExecArray[], template: DataTemplate, filter: DataTemplateFilter, entities: NamedEntityInfo[]): Event[] {
    const dataNames = _.values(filter.data || {});
    if (dataNames.length === 0) {
        debug('no data names to find');
        return [];
    }
    const params: PlainObject<NamedEntity> = {};
    let countAllParams = 0;

    const event: Event = { id: template.id, title: template.title, precision: filter.precision, predicate: template.predicate, data: params };

    regResults.forEach(regResult => {
        for (let i = 1; i < regResult.length; i++) {
            const value = regResult[i];
            const name = filter.data[i];
            const index = regResult.index + regResult[0].indexOf(value);
            const param = findParam(name, template, entities, index, index + value.length);
            if (param) {
                if (!params[name]) {
                    params[name] = param.entity;
                    event.title = formatText(event.title, name, param.entity);
                    countAllParams++;
                }
            } else {
                debug(`Not found entity of type ${template.data[name].type} in: '${value}'`);
                break;
            }
        }
    });

    if (dataNames.length !== countAllParams) {
        debug('not found all params!');
        return [];
    }

    return [event];
}

function findParam(name: string, template: DataTemplate, entities: NamedEntityInfo[], minIndex: number, maxIndex: number) {
    debug('find param', name, minIndex, maxIndex);
    const p = template.data[name];
    if (!p) {
        throw new Error('Invalid param name: ' + name);
    }
    return _.find(entities, item => item.index >= minIndex && item.index < maxIndex && isEntityType(p.type, item.entity.type));
}


function formatText(text: string, name: string, entity: NamedEntity) {
    const reg = new RegExp('\\${' + name + '}', 'g');
    return text.replace(reg, entity.abbr || entity.name);
}