/*!*
 * The Wall for The Mothership by The Afrobanana Republic
 * www.afrobananarepublic.com
 *
 * author rudasn@gmail.com Nicolas Rudas
 * copyright (c) Nicolas Rudas
 */
(function(window, scope) {
  var wall = {}
  wall.host = '//afrobanana-mothership.nodejitsu.com';
  wall.time = 7 * 1000;
  wall.images = [];
  wall.allImages = [];
  wall.onLoadTime = null;
  wall.ids = [];
  wall.checked = [];
  wall.params = queryAsObject(window.location.search.slice(1));
  wall.tags = wall.params.tags ? wall.params.tags.split(',') : [];
  wall.sources = {
    facebook: {
      url: '/facebook/?tag={{ tag }}&user=TheAfroBananaRepublic&type=photo',
      ready: function(results) {
        var wall_ids = wall.ids,
            images = wall.images,
            allImages = wall.allImages,
            responses = Array.prototype.slice.apply(arguments),
            results = [],
            ids = {};

        responses.forEach(function(response, i) {
          var result_ids = ids[i] = {};
          response.data.forEach(function(result) {
            if (wall_ids.indexOf(result.$id) === -1 && ids[result.$id]) {
              results.push(result);
              wall_ids.push(result.$id);
            } else {
              ids[result.$id] = result;
            }
          });
        });

        results.forEach(function(result) {
          result.image = {
            large: result.images[0].url_large || result.images[0].url
          };
          delete result.images;
          wall.images.push(result);
          wall.allImages.push(result);
        });

        console.debug('facebook', results);

        wall.changeImage();
      }
    },
    instagram: {
      url: '/instagram?tag={{ tag }}&type=image',
      ready: function() {
        var wall_ids = wall.ids,
            images = wall.images,
            allImages = wall.allImages,
            responses = Array.prototype.slice.apply(arguments),
            results = [],
            ids = {};

        responses.forEach(function(response, i) {
          var result_ids = ids[i] = {};
          response.forEach(function(result) {
            if (wall_ids.indexOf(result.$id) === -1 && ids[result.$id]) {
              results.push(result);
              wall_ids.push(result.$id);
            } else {
              ids[result.$id] = result;
            }
          });
        });

        results.forEach(function(result) {
          result.image = {
            large: result.images.standard_resolution.url
          };
          delete result.images;
          wall.images.push(result);
          wall.allImages.push(result);
        });

        console.debug('instagram', results);

        wall.changeImage();
      }
    }
  }

  function countOccurrences(array, item) {
    var o = {};
    array.forEach(function(i) {
      o[i] = o[i] ? o[i] + 1 : 1;
    });
    return o[item] || 0;
  }

  wall.changeImage = function changeImage() {
    if (wall.onLoadTime || !wall.allImages.length) { return; }
    wall.onLoadTime = true;

    var image_index = getRandomArbitrary(0, wall.images.length - 1),
        image = wall.images[image_index],
        $images = document.getElementsByClassName('image-wrapper'),
        $clone = $images[0].cloneNode(),
        $image = document.createElement('span'),
        $imageActive = document.getElementsByClassName('image-wrapper-active')[0].cloneNode(),
        imageSrc = new Image();

    $imageActive.classList.add('hide');

    if (!image) {
      var rand = getRandomArbitrary(0, wall.allImages.length - 1),
          image = wall.allImages[rand];

      $imageActive.style.backgroundImage = 'url("' + image.image.large + '")';
      requestAnimationFrame(function() {
        $imageActive.classList.remove('hide');
      });

      setTimeout(function() {
        requestAnimationFrame(function() {
          $clone = null;
          $image = null;
          $images = null;
          $imageActive.classList.add('hide');
          wall.onLoadTime = null;
          wall.changeImage();
          setTimeout(function() {
            $imageActive.parentNode.removeChild($imageActive);
            $imageActive = null;
          }, 500);
        });
      }, wall.time);

      requestAnimationFrame(wall.fetch);

    } else {
      wall.images.splice(image_index, 1);
      (function($clone) {
        imageSrc.onload = imageSrc.onerror = function() {
          $image.style.backgroundImage = 'url("' + image.image.large + '")';
          $imageActive.style.backgroundImage = 'url("' + image.image.large + '")';
          $imageActive.classList.remove('hide');

          window.scrollTo(0, document.body.scrollHeight);
          setTimeout(function() {
            requestAnimationFrame(function() {
              $clone.appendChild($image);
              $images[0].parentNode.appendChild($clone);
              $clone = null;
              $image = null;
              $images = null;
              $imageActive.classList.add('hide');
              wall.onLoadTime = null;
              wall.changeImage();
              setTimeout(function() {
                $imageActive.parentNode.removeChild($imageActive);
                $imageActive = null;
              }, 500);
            });
          }, wall.time);
          imageSrc = null;
        };
      })($clone);

      imageSrc.src = image.image.large;
    }
    console.log('change', wall.images.length, image.image.large);
    document.getElementById('image').appendChild($imageActive);
  };

  wall.fetch = function fetch() {
    if (wall.fetch.$fetching ||
        (Date.now() - wall.fetch.$throttleLast) < wall.fetch.$throttle) {
      return;
    }
    wall.fetch.$fetching = true;
    wall.fetch.$throttleLast = Date.now();

    var tags = wall.tags,
        sources = wall.sources,
        domScript = document.createElement('script'),
        instagram_clone;

    Object.keys(sources).forEach(function(name) {
      var cb = '_' + Date.now()
      var source = sources[name],
          responses = [];

      wall[cb] = function(results) {
        responses.push(results);
        if (responses.length === tags.length) {
          source.ready.apply(source, responses);
        }
      };

      tags.forEach(function(tag) {
        var clone = domScript.cloneNode(),
            url = source.url ? source.url.replace(/\{\{(.*?)\}\}/gmi, function(string, variable) {
                variable = variable.trim();
                if (variable === 'tag') {
                  return tag;
                }
                return wall[variable];
              }) : null

        if (!url) { return; }

        clone.type = 'text/javascript';
        clone.async = true;
        clone.onload = clone.onerror = function() {
          console.log('end: ', this.src);
          wall.fetch.$fetching = false;
          document.body.removeChild(clone);
          clone = null;
        };

        console.log('start: ', url);
        clone.src = wall.host + url + '&callback=wall.' + cb;
        document.body.appendChild(clone);
      });
    });
  }

  wall.init = function() {
    wall.fetch();
  };
  wall.fetch.$fetching = false;
  wall.fetch.$throttle = 15 * 1000;
  wall.fetch.$throttleLast = null;

  function getRandomArbitrary(min, max) {

    return Math.floor(Math.random() * (max - min) + min);
  }
  function queryAsObject(query) {
    var o = {},
        q = typeof query === 'string' ? query.split('&') : [];
    q.forEach(function(keyval) {
      if (!keyval) { return; }
      var keyval_split = keyval.split('='),
          key = keyval_split[0],
          value = keyval_split[1];
      o[key] = value;
    });
    return o;
  }

  scope.wall = wall;
})(this, this);
