/*
This file is part of Coherent UI, modern user interface library for
games. Release $RELEASE$. Build $VERSION$ for $LICENSEE$.

Copyright (c) 2012-2014 Coherent Labs AD and/or its licensors. All
rights reserved in all media.

The coded instructions, statements, computer programs, and/or related
material (collectively the "Data") in these files contain confidential
and unpublished information proprietary Coherent Labs and/or its
licensors, which is protected by United States of America federal
copyright law and by international treaties.

This software or source code is supplied under the terms of a license
agreement and nondisclosure agreement with Coherent Labs Limited and may
not be copied, disclosed, or exploited except in accordance with the
terms of that agreement. The Data may not be disclosed or distributed to
third parties, in whole or in part, without the prior written consent of
Coherent Labs Limited.

COHERENT LABS MAKES NO REPRESENTATION ABOUT THE SUITABILITY OF THIS
SOURCE CODE FOR ANY PURPOSE. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT
HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER, ITS AFFILIATES,
PARENT COMPANIES, LICENSORS, SUPPLIERS, OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OR PERFORMANCE OF THIS SOFTWARE OR SOURCE CODE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*!
 * Intro - This is an animation library which extends the GSAP library.in order
 * to facilitate usage of GSAP for basic animations.
 */

/*!
 * Sample usage:
 * Create a new CoherentAnimation object.
 * var anim = new CoherentAnimation()
 * After that you can use method chaining to chain animations
 * anim.caTo({selector: "#rect", anims: moveDown })
 *      .caStaggerTo({selector: ".animated", anims: moveDown, stagger: 1})
 */

/*!
 * Animation definition:
 * There are two ways to define animation properties. The first way is percentage
 * based. The syntax is as follows:
 * 1. var moveDown = [
 *          {percent: 0.5, bottom: 10},
 *          {percent: 1, bottom: 20}
 *      ]
 * The second way is based on seconds. The syntax is as follows:
 * 1. Array of objects
 * var moveDown = [
 *          {seconds: 1, bottom: 10},
 *          {seconds: 1, bottom: 20}
 *      ]
 * 2. Single object
 * var moveDown = {seconds: 1, bottom: 10}
 *
 */

(function(global) {
  /*!
  * Create and return a Coherent animation object
  */
  var coherentAnimation = function(TimelineMax) {
    /*!
    * @constructor CoherentExtendGSAP
    * @param {Object} properties - The parameter allows you to configure a
    * CoherentAnimation with a variety of options:
    * new CoherentAnimation({repeat:1, onRepeat:repeatHandler, paused:true});
    */
    var CoherentExtendGSAP = function(properties) {

      this.properties = properties;

      if (typeof this.properties != 'undefined') {
        this.properties.paused = true;
      } else {
        this.properties = {paused: true};
      }

      TimelineMax.call(this, this.properties);
      return this;
    };

    var extendObj = function(childObj, parentObj) {
      var tmpObj = function() {};
      tmpObj.prototype = parentObj.prototype;
      childObj.prototype = new tmpObj();
      childObj.prototype.constructor = childObj;
    };

    // Inherent TimelineMax
    extendObj(CoherentExtendGSAP, TimelineMax);

    /*!
    * Adds a tween animation - this will start your animation,
    * animated your dom element until it reaches its current style.
    * @methods caFrom
    * @param {Object} obj - this object must have the following parameters:
    * selector: {Object} DOM element or string selector
    * anims: {Object} this is your animations description
    * duration (optional): {Number}
    * offset(optional): {Number} (default = +=0) — Controls the placement
    * of the tween in the timeline (by default, it's the end of the timeline,
    * like "+=0"). Use a number to indicate an absolute time in terms of
    * seconds (or frames for frames-based timelines), or you can use a string
    * with a "+=" or "-=" prefix to offset the insertion point relative to
    * the END of the timeline. For example, "+=2" would place the tween 2
    * seconds after the end, leaving a 2-second gap. "-=2" would create a
    * 2-second overlap
    */
    CoherentExtendGSAP.prototype.caFrom = function(obj) {
      this._setAnim(this._thunkFrom, obj);
      return this;
    };

    CoherentExtendGSAP.prototype._thunkFrom = function(elements, dur,
                                                        finalAnim,
                                                        stagger, offset) {
      this.from(elements, dur, finalAnim, offset);
    };

    /*!
    * Adds a tween animation - this will start your animation. Starts from
    * current values of selected object and ends when then given style is reached.
    * @methods caTo
    * @param {Object} obj - see caFrom method
    */
    CoherentExtendGSAP.prototype.caTo = function(obj) {
      this._setAnim(this._thunkTo, obj);
      return this;
    };

    CoherentExtendGSAP.prototype._thunkTo = function(elements, dur,
                                                      finalAnim, stagger,
                                                      offset) {
      this.to(elements, dur, finalAnim, offset);
    };

    /*!
    * Tweens an array of targets to a common set of destination values, but
    * staggers their start times by a specified amount of time, creating an
    * evenly-spaced sequence.
    * @methods caStaggerTo
    * @param {Object} obj - this object must have a following parameters:
    * selector: DOM elements('.myClass') or
    * javascript array([element1, element2, element3])
    * anims: {Object} this is your snippet animations object
    * stagger: {Number} - Amount of time in seconds (or frames if the timeline
    * is frames-based) to stagger the start time of each tween.
    * offset(optional): {Number} (default = +=0) — Controls the placement of
    * the tween in the timeline (by default, it's the end of the timeline,
    * like "+=0"). Use a number to indicate an absolute time in terms of
    * seconds (or frames for frames-based timelines), or you can use a
    * string with a "+=" or "-=" prefix to offset the insertion point relative
    * to the END of the timeline. For example, "+=2" would place the tween
    * 2 seconds after the end, leaving a 2-second gap. "-=2" would create
    * a 2-second
    */
    CoherentExtendGSAP.prototype.caStaggerFrom = function(obj) {
      this._setAnim(this.staggerFrom, obj);
      return this;
    };

    /*!
    * Tweens an array of targets to a common set of destination values, but
    * staggers their start times by a specified amount of time, creating an
    * @methods caStaggerTo
    * @param {Object} obj - see caStaggerFrom method
    */
    CoherentExtendGSAP.prototype.caStaggerTo = function(obj) {
      this._setAnim(this.staggerTo, obj);
      return this;
    };

    /*
    * @methods setAnim
    * This method abstracts away some of original methods in TimelineMax
    */
    CoherentExtendGSAP.prototype._setAnim = function(method, obj) {
      var elements,
          percent,
          offset = obj.offset || '+=0',
          stagger = obj.stagger || '0',
          duration = obj.seconds || null;

      if (typeof(obj.selector) === 'string') {
        elements = document.querySelectorAll(obj.selector);
      } else {
        elements = obj.selector;
      }

      if (!(obj.anims instanceof Array)) {

        this._animFactory(method, obj.anims, elements,
                          offset, stagger, obj.anims.seconds);

      } else {
        var len = obj.anims.length;

        for (var i = 0; i < len; ++i) {
          var currentAnims = obj.anims[i];
          var dur = currentAnims.seconds || currentAnims.percent;

          if (typeof dur === 'undefined') {
            throw new Error('Your time duration in seconds or percents ' +
                            'is not set!');
          }

          if (currentAnims.percent) {
            if (i === 0) {
              dur = currentAnims.percent;
            } else {
              dur = currentAnims.percent - obj.anims[i - 1].percent;
            }
            dur *= duration;
          }

          this._animFactory(method, currentAnims, elements,
                            offset, stagger, dur);
        }
      }
    };

    CoherentExtendGSAP.prototype._animFactory = function(method, objAnims,
                                                          elements, offset,
                                                          stagger, dur) {
      var finalAnim = cloneObject(objAnims);
      finalAnim.ease = objAnims.ease|| Linear.easeNone;

      if (finalAnim.offset !== undefined) {
        offset = finalAnim.offset;
      }

      delete finalAnim.seconds;
      delete finalAnim.offset;
      delete finalAnim.percent;

      method.call(this, elements, dur, finalAnim, stagger, offset);
    };

    function cloneObject(obj) {
      var clone = {};
      for (var i in obj) {
        var a = obj[i];
        if (typeof(a) === 'object' && a !== null) {
          clone[i] = cloneObject(a);
        } else {
          clone[i] = a;
        }
      }
      return clone;
    }

    global.CoherentAnimation = CoherentExtendGSAP;

    return CoherentExtendGSAP;
  };

  /*!
  * export to AMD/RequireJS/Node.js or to the browser environment 
  * (scripts tags in HTML)
  */
  if (typeof define === 'function' && define.amd) {
    require.config({
      // By default coherent_animations.js is in the directory
      // js/libs/coherent_animation/coherent_animations.js starting
      // from your index.html file. If you change the path you need
      // to change the paths on TimelineMax and TweenMax below.
      paths: {
        TimelineMax: '../../../js/gsap/TimelineMax',
        TweenMax: '../../../js/gsap/TweenMax',
      },
      shim: {
        'TimelineMax': ['TweenMax'],
      }
    });
    define('CoherentAnimation', ['TimelineMax'],
           function(TimelineMax) {
      return coherentAnimation(TimelineMax);
    });
  } else if (typeof(module) !== 'undefined' && module.exports) { //node
    // Not working correctly for now
    //var TimelineMax = require("./TimelineMax.js"); //dependency
    //var coherentAnimation = coherentAnimation(TimelineMax);
    //module.exports = coherentAnimation;
  } else {

    var orderErrmessage =  'To run coherent_animation.js you need to ' +
        'include TweenMax.js and TimelineMax.js in order: TweenMax, ' +
        'TimelineMax, coherent_animation.js';

    // Check for include order on files
    if (typeof global.TweenMax === 'undefined') {
      throw new Error('TweenMax is not included. ' + orderErrmessage);
    } else if (typeof global.TimelineMax === 'undefined') {
      throw new Error('TimelineMax is not included. ' + orderErrmessage);
    }
    coherentAnimation(global.TimelineMax);
  }
})((typeof(module) !== 'undefined' && module.exports &&
    typeof(global) !== 'undefined') ? global : this || window);
