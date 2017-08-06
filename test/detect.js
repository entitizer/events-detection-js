
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
            // console.log(events);
            assert.equal(2, events.length, 'events.length===2');
            assert.equal('Dmitri Rogozin', events[0].data.subject.name);
            done();
        });
    });

    it('should detect `persona non grata` 2', function (done) {
        detect({
            lang: 'ro',
            text: 'Președintele Igor Dodon care a avut sâmbătă, 5 august, la Teheran o întrevedere cu vicepremierul rus Dmitri Rogozin i-a solicitat Rusiei să se abțină de la sancțiuni care ar afecta cetățenii și agenții economici. El s-a referit în acest sens la decizia Guvernului de al declara persona non-grata pe Dmitri Rogozin.',
            entities: [{
                index: 13,
                entity: { id: 1, name: 'Igor Dodon', type: 'person' }
            }, {
                index: 108,
                entity: { id: 2, name: 'Dmitri Rogozin', type: 'person' }
            }]
        }, (error, events) => {
            if (error) {
                return done(error);
            }
            // console.log(events);
            assert.equal(2, events.length, 'events.length===2');
            assert.equal('Igor Dodon', events[0].data.subject.name);
            assert.equal('Dmitri Rogozin', events[1].data.subject.name);
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
            assert.equal('Vlad Filat', events[0].data.subject.name);
            // console.log(events)
            done();
        });
    });

});

