const builtin = 'round';
export const description = `
Validation tests for the ${builtin}() builtin.
`;

import { makeTestGroup } from '../../../../../../common/framework/test_group.js';
import { keysOf, objectsToRecord } from '../../../../../../common/util/data_tables.js';
import {
  TypeF16,
  TypeF32,
  elementType,
  kAllConcreteIntegerScalarsAndVectors,
  kConvertableToFloatScalarsAndVectors,
} from '../../../../../util/conversion.js';
import { fpTraitsFor } from '../../../../../util/floating_point.js';
import { ShaderValidationTest } from '../../../shader_validation_test.js';

import {
  fullRangeForType,
  kConstantAndOverrideStages,
  stageSupportsType,
  unique,
  validateConstOrOverrideBuiltinEval,
} from './const_override_validation.js';

export const g = makeTestGroup(ShaderValidationTest);

const kValuesTypes = objectsToRecord(kConvertableToFloatScalarsAndVectors);

g.test('values')
  .desc(
    `
Validates that constant evaluation and override evaluation of ${builtin}() inputs rejects invalid values
`
  )
  .params(u =>
    u
      .combine('stage', kConstantAndOverrideStages)
      .combine('type', keysOf(kValuesTypes))
      .filter(u => stageSupportsType(u.stage, kValuesTypes[u.type]))
      .beginSubcases()
      .expand('value', u => {
        if (elementType(kValuesTypes[u.type]).kind === 'abstract-int') {
          return fullRangeForType(kValuesTypes[u.type]);
        } else {
          const constants = fpTraitsFor(elementType(kValuesTypes[u.type])).constants();
          return unique(fullRangeForType(kValuesTypes[u.type]), [
            constants.negative.min + 0.1,
            constants.positive.max - 0.1,
          ]);
        }
      })
  )
  .beforeAllSubcases(t => {
    if (elementType(kValuesTypes[t.params.type]) === TypeF16) {
      t.selectDeviceOrSkipTestCase('shader-f16');
    }
  })
  .fn(t => {
    const expectedResult = true; // Result should always be representable by the type
    validateConstOrOverrideBuiltinEval(
      t,
      builtin,
      expectedResult,
      [kValuesTypes[t.params.type].create(t.params.value)],
      t.params.stage
    );
  });

const kIntegerArgumentTypes = objectsToRecord([TypeF32, ...kAllConcreteIntegerScalarsAndVectors]);

g.test('integer_argument')
  .desc(
    `
Validates that scalar and vector integer arguments are rejected by ${builtin}()
`
  )
  .params(u => u.combine('type', keysOf(kIntegerArgumentTypes)))
  .fn(t => {
    const type = kIntegerArgumentTypes[t.params.type];
    validateConstOrOverrideBuiltinEval(
      t,
      builtin,
      /* expectedResult */ type === TypeF32,
      [type.create(1)],
      'constant'
    );
  });
