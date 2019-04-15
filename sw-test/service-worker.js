/**
 * Expose `pathToRegexp`.
 */
var pathToRegexp_1 = pathToRegexp;
var parse_1 = parse;
var compile_1 = compile;
var tokensToFunction_1 = tokensToFunction;
var tokensToRegExp_1 = tokensToRegExp;

/**
 * Default configs.
 */
var DEFAULT_DELIMITER = '/';

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // ":test(\\d+)?" => ["test", "\d+", undefined, "?"]
  // "(\\d+)"  => [undefined, undefined, "\d+", undefined]
  '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
function parse (str, options) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER;
  var whitelist = (options && options.whitelist) || undefined;
  var pathEscaped = false;
  var res;

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      pathEscaped = true;
      continue
    }

    var prev = '';
    var name = res[2];
    var capture = res[3];
    var group = res[4];
    var modifier = res[5];

    if (!pathEscaped && path.length) {
      var k = path.length - 1;
      var c = path[k];
      var matches = whitelist ? whitelist.indexOf(c) > -1 : true;

      if (matches) {
        prev = c;
        path = path.slice(0, k);
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
      pathEscaped = false;
    }

    var repeat = modifier === '+' || modifier === '*';
    var optional = modifier === '?' || modifier === '*';
    var pattern = capture || group;
    var delimiter = prev || defaultDelimiter;

    tokens.push({
      name: name || key++,
      prefix: prev,
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: pattern
        ? escapeGroup(pattern)
        : '[^' + escapeString(delimiter === defaultDelimiter ? delimiter : (delimiter + defaultDelimiter)) + ']+?'
    });
  }

  // Push any remaining characters.
  if (path || index < str.length) {
    tokens.push(path + str.substr(index));
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
function compile (str, options) {
  return tokensToFunction(parse(str, options))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
    }
  }

  return function (data, options) {
    var path = '';
    var encode = (options && options.encode) || encodeURIComponent;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;
        continue
      }

      var value = data ? data[token.name] : undefined;
      var segment;

      if (Array.isArray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but got array')
        }

        if (value.length === 0) {
          if (token.optional) continue

          throw new TypeError('Expected "' + token.name + '" to not be empty')
        }

        for (var j = 0; j < value.length; j++) {
          segment = encode(value[j], token);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        segment = encode(String(value), token);

        if (!matches[i].test(segment)) {
          throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but got "' + segment + '"')
        }

        path += token.prefix + segment;
        continue
      }

      if (token.optional) continue

      throw new TypeError('Expected "' + token.name + '" to be ' + (token.repeat ? 'an array' : 'a string'))
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$/()])/g, '\\$1')
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
function flags (options) {
  return options && options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */
function regexpToRegexp (path, keys) {
  if (!keys) return path

  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      });
    }
  }

  return path
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  return new RegExp('(?:' + parts.join('|') + ')', flags(options))
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function stringToRegexp (path, keys, options) {
  return tokensToRegExp(parse(path, options), keys, options)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
function tokensToRegExp (tokens, keys, options) {
  options = options || {};

  var strict = options.strict;
  var start = options.start !== false;
  var end = options.end !== false;
  var delimiter = options.delimiter || DEFAULT_DELIMITER;
  var endsWith = [].concat(options.endsWith || []).map(escapeString).concat('$').join('|');
  var route = start ? '^' : '';

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var capture = token.repeat
        ? '(?:' + token.pattern + ')(?:' + escapeString(token.delimiter) + '(?:' + token.pattern + '))*'
        : token.pattern;

      if (keys) keys.push(token);

      if (token.optional) {
        if (!token.prefix) {
          route += '(' + capture + ')?';
        } else {
          route += '(?:' + escapeString(token.prefix) + '(' + capture + '))?';
        }
      } else {
        route += escapeString(token.prefix) + '(' + capture + ')';
      }
    }
  }

  if (end) {
    if (!strict) route += '(?:' + escapeString(delimiter) + ')?';

    route += endsWith === '$' ? '$' : '(?=' + endsWith + ')';
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === 'string'
      ? endToken[endToken.length - 1] === delimiter
      : endToken === undefined;

    if (!strict) route += '(?:' + escapeString(delimiter) + '(?=' + endsWith + '))?';
    if (!isEndDelimited) route += '(?=' + escapeString(delimiter) + '|' + endsWith + ')';
  }

  return new RegExp(route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
function pathToRegexp (path, keys, options) {
  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys)
  }

  if (Array.isArray(path)) {
    return arrayToRegexp(/** @type {!Array} */ (path), keys, options)
  }

  return stringToRegexp(/** @type {string} */ (path), keys, options)
}
pathToRegexp_1.parse = parse_1;
pathToRegexp_1.compile = compile_1;
pathToRegexp_1.tokensToFunction = tokensToFunction_1;
pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var dateArithmetic = createCommonjsModule(function (module) {
var MILI    = 'milliseconds'
  , SECONDS = 'seconds'
  , MINUTES = 'minutes'
  , HOURS   = 'hours'
  , DAY     = 'day'
  , WEEK    = 'week'
  , MONTH   = 'month'
  , YEAR    = 'year'
  , DECADE  = 'decade'
  , CENTURY = 'century';

var dates = module.exports = {

  add: function(date, num, unit) {
    date = new Date(date);

    switch (unit){
      case MILI:
      case SECONDS:
      case MINUTES:
      case HOURS:
      case YEAR:
        return dates[unit](date, dates[unit](date) + num)
      case DAY:
        return dates.date(date, dates.date(date) + num)
      case WEEK:
        return dates.date(date, dates.date(date) + (7 * num)) 
      case MONTH:
        return monthMath(date, num)
      case DECADE:
        return dates.year(date, dates.year(date) + (num * 10))
      case CENTURY:
        return dates.year(date, dates.year(date) + (num * 100))
    }

    throw new TypeError('Invalid units: "' + unit + '"')
  },

  subtract: function(date, num, unit) {
    return dates.add(date, -num, unit)
  },

  startOf: function(date, unit, firstOfWeek) {
    date = new Date(date);

    switch (unit) {
      case 'century':
      case 'decade':
      case 'year':
          date = dates.month(date, 0);
      case 'month':
          date = dates.date(date, 1);
      case 'week':
      case 'day':
          date = dates.hours(date, 0);
      case 'hours':
          date = dates.minutes(date, 0);
      case 'minutes':
          date = dates.seconds(date, 0);
      case 'seconds':
          date = dates.milliseconds(date, 0);
    }

    if (unit === DECADE) 
      date = dates.subtract(date, dates.year(date) % 10, 'year');
    
    if (unit === CENTURY) 
      date = dates.subtract(date, dates.year(date) % 100, 'year');

    if (unit === WEEK) 
      date = dates.weekday(date, 0, firstOfWeek);

    return date
  },


  endOf: function(date, unit, firstOfWeek){
    date = new Date(date);
    date = dates.startOf(date, unit, firstOfWeek);
    date = dates.add(date, 1, unit);
    date = dates.subtract(date, 1, MILI);
    return date
  },

  eq:  createComparer(function(a, b){ return a === b }),
  neq: createComparer(function(a, b){ return a !== b }),
  gt:  createComparer(function(a, b){ return a > b }),
  gte: createComparer(function(a, b){ return a >= b }),
  lt:  createComparer(function(a, b){ return a < b }),
  lte: createComparer(function(a, b){ return a <= b }),

  min: function(){
    return new Date(Math.min.apply(Math, arguments))
  },

  max: function(){
    return new Date(Math.max.apply(Math, arguments))
  },
  
  inRange: function(day, min, max, unit){
    unit = unit || 'day';

    return (!min || dates.gte(day, min, unit))
        && (!max || dates.lte(day, max, unit))
  },

  milliseconds:   createAccessor('Milliseconds'),
  seconds:        createAccessor('Seconds'),
  minutes:        createAccessor('Minutes'),
  hours:          createAccessor('Hours'),
  day:            createAccessor('Day'),
  date:           createAccessor('Date'),
  month:          createAccessor('Month'),
  year:           createAccessor('FullYear'),

  decade: function (date, val) {
    return val === undefined 
      ? dates.year(dates.startOf(date, DECADE))
      : dates.add(date, val + 10, YEAR);
  },

  century: function (date, val) {
    return val === undefined 
      ? dates.year(dates.startOf(date, CENTURY))
      : dates.add(date, val + 100, YEAR);
  },

  weekday: function (date, val, firstDay) {
      var weekday = (dates.day(date) + 7 - (firstDay || 0) ) % 7;

      return val === undefined 
        ? weekday 
        : dates.add(date, val - weekday, DAY);
  },

  diff: function (date1, date2, unit, asFloat) {
    var dividend, divisor, result;

    switch (unit) {
      case MILI:
      case SECONDS:
      case MINUTES:
      case HOURS:
      case DAY:
      case WEEK:
        dividend = date2.getTime() - date1.getTime(); break;
      case MONTH:
      case YEAR:
      case DECADE:
      case CENTURY:
        dividend = (dates.year(date2) - dates.year(date1)) * 12 + dates.month(date2) - dates.month(date1); break;
      default:
        throw new TypeError('Invalid units: "' + unit + '"');
    }

    switch (unit) {
      case MILI:
          divisor = 1; break;
      case SECONDS:
          divisor = 1000; break;
      case MINUTES:
          divisor = 1000 * 60; break;
      case HOURS:
          divisor = 1000 * 60 * 60; break;
      case DAY:
          divisor = 1000 * 60 * 60 * 24; break;
      case WEEK:
          divisor = 1000 * 60 * 60 * 24 * 7; break;
      case MONTH:
          divisor = 1; break;
      case YEAR:
          divisor = 12; break;
      case DECADE:
          divisor = 120; break;
      case CENTURY:
          divisor = 1200; break;
      default:
        throw new TypeError('Invalid units: "' + unit + '"');
    }

    result = dividend / divisor;

    return asFloat ? result : absoluteFloor(result);
  }
};

function absoluteFloor(number) {
  return number < 0 ? Math.ceil(number) : Math.floor(number);
}

function monthMath(date, val){
  var current = dates.month(date)
    , newMonth  = (current + val);

    date = dates.month(date, newMonth);

    while (newMonth < 0 ) newMonth = 12 + newMonth;
      
    //month rollover
    if ( dates.month(date) !== ( newMonth % 12))
      date = dates.date(date, 0); //move to last of month

    return date
}

function createAccessor(method){
  return function(date, val){
    if (val === undefined)
      return date['get' + method]()

    date = new Date(date);
    date['set' + method](val);
    return date
  }
}

function createComparer(operator) {
  return function (a, b, unit) {
    return operator(+dates.startOf(a, unit), +dates.startOf(b, unit))
  };
}
});
var dateArithmetic_1 = dateArithmetic.add;
var dateArithmetic_2 = dateArithmetic.subtract;
var dateArithmetic_3 = dateArithmetic.startOf;
var dateArithmetic_4 = dateArithmetic.endOf;
var dateArithmetic_5 = dateArithmetic.eq;
var dateArithmetic_6 = dateArithmetic.neq;
var dateArithmetic_7 = dateArithmetic.gt;
var dateArithmetic_8 = dateArithmetic.gte;
var dateArithmetic_9 = dateArithmetic.lt;
var dateArithmetic_10 = dateArithmetic.lte;
var dateArithmetic_11 = dateArithmetic.min;
var dateArithmetic_12 = dateArithmetic.max;
var dateArithmetic_13 = dateArithmetic.inRange;
var dateArithmetic_14 = dateArithmetic.milliseconds;
var dateArithmetic_15 = dateArithmetic.seconds;
var dateArithmetic_16 = dateArithmetic.minutes;
var dateArithmetic_17 = dateArithmetic.hours;
var dateArithmetic_18 = dateArithmetic.day;
var dateArithmetic_19 = dateArithmetic.date;
var dateArithmetic_20 = dateArithmetic.month;
var dateArithmetic_21 = dateArithmetic.year;
var dateArithmetic_22 = dateArithmetic.decade;
var dateArithmetic_23 = dateArithmetic.century;
var dateArithmetic_24 = dateArithmetic.weekday;
var dateArithmetic_25 = dateArithmetic.diff;

/* eslint-disable no-bitwise, no-nested-ternary */
const LATENCY = 200;
function uuid() {
  let i, random;
  let id = '';

  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) id += '-';
    id += (i === 12 ? 4 : i === 16 ? random & 3 | 8 : random).toString(16);
  }

  return id;
}

const isDate = d => !!(d && d.getTime);

const isDateString = d => typeof d === 'string' && !isNaN(Date.parse(d));

const isOperator = v => v && typeof v === 'object';

const buildFilter = filter => {
  const entries = Object.entries(filter).filter(e => e[1] != null);
  return item => entries.reduce((include, _ref) => {
    let key = _ref[0],
        value = _ref[1];
    if (!include) return false;
    let itemValue = item[key];
    const operators = isOperator(value) ? Object.entries(value) : ['$eq', value];
    return operators.every((_ref2) => {
      let operator = _ref2[0],
          opValue = _ref2[1];

      if (isDate(opValue) || isDateString(itemValue)) {
        itemValue = itemValue && new Date(itemValue);
      }

      if (operator !== '$eq' && operator !== '$neq') {
        if (itemValue == null) return false;
      }

      switch (operator) {
        case '$eq':
          return itemValue === opValue;

        case '$neq':
          return itemValue !== opValue;

        case '$lt':
          return itemValue < opValue;

        case '$lte':
          return itemValue <= opValue;

        case '$gt':
          return itemValue > opValue;

        case '$gte':
          return itemValue >= opValue;

        default:
          return include;
      }
    });
  }, true);
};
const fakeLatency = () => new Promise(resolve => setTimeout(resolve, LATENCY));

// @ts-ignore
const now = new Date();
const startOfWeek = dateArithmetic.startOf(now, 'week');
const startOfLastWeek = dateArithmetic.startOf(dateArithmetic.add(now, -1, 'week'), 'week');
const labels = [{
  id: uuid(),
  title: 'Blocked',
  color: null
}, {
  id: uuid(),
  title: 'Tech Debt',
  color: null
}, {
  id: uuid(),
  title: 'Bug',
  color: null
}, {
  id: uuid(),
  title: 'Feature',
  color: null
}, {
  id: uuid(),
  title: 'Upstream',
  color: null
}];
const todos = [{
  id: uuid(),
  title: 'Fix Flummox overheating',
  labels: [labels[2]],
  dueDate: null,
  completed: false
}, {
  id: uuid(),
  title: 'Add Whatitz analytics',
  labels: [labels[0], labels[4]],
  dueDate: null,
  completed: false
}, {
  id: uuid(),
  title: 'Wax Ventricals',
  labels: [],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(now, -1, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Prevent explosions',
  labels: [],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(startOfWeek, -3, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Bowline Gimbels',
  labels: [labels[0]],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(now, -10, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Recipricate Splines',
  labels: [],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(now, -8, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Get pistons detailed',
  labels: [],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(startOfWeek, -2, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Harness Core',
  labels: [labels[2]],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(now, -15, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Calibrate torques',
  labels: [],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(now, -17, 'day').toISOString()
}, {
  id: uuid(),
  title: 'Recalibrate Floozel',
  labels: [labels[1]],
  dueDate: null,
  completed: true,
  completedAt: dateArithmetic.add(startOfLastWeek, -20, 'day').toISOString()
}];

const normalizeTodo = todo => _extends({}, todo, {
  id: 'id' in todo ? todo.id : uuid(),
  completed: todo.completed || false,
  dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
  // eslint-disable-next-line no-nested-ternary
  completedAt: todo.completedAt ? new Date(todo.completedAt) : todo.completed ? new Date() : null,
  labels: todo.labels ? todo.labels.map(l => l.id) : []
});

const resolveTodo = todo => _extends({}, todo, {
  dueDate: todo.dueDate && todo.dueDate.toISOString(),
  completedAt: todo.completedAt && todo.completedAt.toISOString(),
  // eslint-disable-next-line  @typescript-eslint/no-use-before-define, no-use-before-define
  labels: todo.labels ? todo.labels.map(l => LABELS.get(l)) : []
});

const normalizeLabel = label => _extends({}, label, {
  id: 'id' in label ? label.id : uuid(),
  color: label.color || null
});

const TODOS = new Map(todos.map(t => [t.id, normalizeTodo(t)]));
const LABELS = new Map(labels.map(l => [l.id, normalizeLabel(l)]));
var db = {
  async createTodo(input) {
    const todo = normalizeTodo(input);
    TODOS.set(todo.id, todo);
    await fakeLatency();
    return resolveTodo(todo);
  },

  async updateTodo(nextTodo) {
    TODOS.set(nextTodo.id, Object.assign(TODOS.get(nextTodo.id), normalizeTodo(nextTodo)));
    await fakeLatency();
    return resolveTodo(TODOS.get(nextTodo.id));
  },

  async deleteTodo(todo) {
    TODOS.delete(todo.id);
    await fakeLatency();
    return todo.id;
  },

  async getTodo(id) {
    await fakeLatency();
    return TODOS.has(id) ? resolveTodo(TODOS.get(id)) : null;
  },

  async getTodos(filter) {
    const filterer = filter && buildFilter(filter);
    await fakeLatency();
    const allTodos = Array.from(TODOS.values(), resolveTodo);
    if (!filterer) return allTodos;
    return allTodos.filter(filterer);
  },

  async createLabel(input) {
    const label = normalizeLabel(input);
    LABELS.set(label.id, label);
    await fakeLatency();
    return label;
  },

  async updateLabel(nextLabel) {
    LABELS.set(nextLabel.id, Object.assign(LABELS.get(nextLabel.id), normalizeLabel(nextLabel)));
    await fakeLatency();
    return _extends({}, LABELS.get(nextLabel.id));
  },

  async deleteLabel(label) {
    TODOS.delete(label.id);
    await fakeLatency();
    return label.id;
  },

  async getLabel(id) {
    await fakeLatency();
    return LABELS.has(id) ? _extends({}, LABELS.get(id)) : null;
  },

  async getLabels(filter) {
    const filterer = filter && buildFilter(filter);
    await fakeLatency();
    const allLabels = Array.from(LABELS.values(), l => _extends({}, l));
    if (!filterer) return allLabels;
    return allLabels.filter(filterer);
  }

};

let Api =
/*#__PURE__*/
function () {
  function Api() {}

  var _proto = Api.prototype;

  _proto.getTodo = function getTodo(id) {
    if (!id) throw TypeError('Todo id is required');
    return db.getTodo(id);
  };

  _proto.getTodos = function getTodos(_temp) {
    let _ref = _temp === void 0 ? {} : _temp,
        filter = _ref.filter;

    return db.getTodos(filter);
  };

  _proto.saveTodo = function saveTodo(todo) {
    return 'id' in todo ? db.updateTodo(todo) : db.createTodo(todo);
  };

  _proto.getLabel = function getLabel(id) {
    if (!id) throw TypeError('Label id is required');
    return db.getLabel(id);
  };

  _proto.getLabels = function getLabels(_temp2) {
    let _ref2 = _temp2 === void 0 ? {} : _temp2,
        filter = _ref2.filter;

    return db.getLabels(filter);
  };

  _proto.saveLabel = function saveLabel(label) {
    return 'id' in label ? db.updateLabel(label) : db.createLabel(label);
  };

  return Api;
}();
var api = new Api();

/* eslint-disable no-await-in-loop */

function makeResponse(data, status) {
  if (status === void 0) {
    status = 200;
  }

  return new Response(data ? JSON.stringify({
    data
  }) : '', {
    status
  });
}

const routes = [[pathToRegexp_1('/labels/:id?'), async (_ref, event) => {
  let id = _ref[0];
  if (event.request.method === 'GET') return makeResponse((await (id ? api.getLabel(id) : api.getLabels())));
  const json = await event.request.json();
  return makeResponse((await api.saveLabel(json)), id ? 200 : 201);
}], [pathToRegexp_1('/todos/:id?'), async (_ref2, event) => {
  let id = _ref2[0];
  if (event.request.method === 'GET') return makeResponse((await (id ? api.getTodo(id) : api.getTodos())));
  return makeResponse((await api.saveTodo((await event.request.json()))), id ? 200 : 201);
}]]; // eslint-disable-next-line no-restricted-globals

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname !== 'api.todos.com') return;
  const resource = url.pathname.slice('/api/v1'.length);

  for (const _ref3 of routes) {
    const regexp = _ref3[0];
    const handler = _ref3[1];
    const match = regexp.exec(resource);

    if (match) {
      event.respondWith(handler(match.slice(1), event));
      return;
    }
  }
});
self.addEventListener('install', () => {
  // Skip over the "waiting" lifecycle state, to ensure that our
  // new service worker is activated immediately, even if there's
  // another tab open controlled by our older service worker code.
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
