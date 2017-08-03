# events-detection

A simple in text events detection module.

## Usage

``` js
const { detect } = require('events-detection');

detect({
    lang: 'ro',
    text: 'Some text',
    // entities in text
    entities: [{index: 10, entity: {id:101, name: 'Dmitri Rogozin', type: 'person'}}]
}, (error, events) => {
    // got events if found any
});

```

### Event object:

- title (`string`)
- precision (`number`) - event precision: 0..1
- entities (NamedEntity[]) - an array of named entities in event
