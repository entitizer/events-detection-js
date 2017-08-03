
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';

export { Bluebird, _ }
export type PlainObject<T> = {
    [index: string]: T
}
export type AnyPlainObject = PlainObject<any>
export type StringPlainObject = PlainObject<string>

export interface Callback<T> { (error: Error, data?: T): void }

export function isPerson(name: string): boolean {
    return ['person'].indexOf((name || '').toLowerCase()) > -1;
}

export function isLocation(name: string): boolean {
    return ['location', 'place', 'country'].indexOf((name || '').toLowerCase()) > -1;
}

export function isEntityType(type: string, name: string) {
    return isPerson(type) && isPerson(name) || isLocation(type) && isLocation(name);
}
