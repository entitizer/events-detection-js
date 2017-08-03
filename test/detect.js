
const { detect } = require('../lib');
const assert = require('assert');

describe('detect', function () {

    it('should detect `persona non grata`', function (done) {
        detect({
            lang: 'ro',
            text: 'declara PERSONA NON GRATA pe Dmitri Rogozin in R. Moldova',
            entities: [{
                index: 29,
                entity: { id: 1, name: 'Dmitri Rogozin', type: 'person' }
            }]
        }, (error, events) => {
            if (error) {
                return done(error);
            }
            assert.equal(1, events.length, 'events.length===1');
            assert.equal('Dmitri Rogozin', events[0].entities[0].name);
            done();
        });
    });

    it('should detect `sentenced person`', function (done) {
        detect({
            lang: 'ro',
            text: 'Fostul premier Vlad Filat, condamnat la 9 ani de închisoare',
            entities: [{
                index: 15,
                entity: { id: 1, name: 'Vlad Filat', type: 'person' }
            }]
        }, (error, events) => {
            if (error) {
                return done(error);
            }
            assert.equal(1, events.length, 'events.length===1');
            assert.equal('Vlad Filat', events[0].entities[0].name);
            console.log(events)
            done();
        });
    });

});

