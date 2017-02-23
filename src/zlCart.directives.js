//ZLCART.DIRECTIVES.JS
'use strict';

angular.module('zlCart.directives', ['zlCart.fulfilment'])

.controller('zlCartController', ['$scope', 'zlCart', function($scope, zlCart) {
  $scope.zlCart = zlCart;
}])

.directive('zlcartAddtocart', ['zlCart', 'zlCartDiscount', function(zlCart, zlCartDiscount) {
  return {
    restrict: 'E',
    controller: 'zlCartController',
    scope: {
      id: '@',
      name: '@',
      quantity: '@',
      quantityMax: '@',
      price: '@',
      tax: '@',
      data: '=',
      checkItem: '@?'
    },
    transclude: true,
    replace: true,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/addtocart.html';
      } else {
        return attrs.templateUrl;
      }
    },
    link: function(scope, element, attrs) {
      scope.attrs = attrs;
      scope.inCart = function() {
        if (attrs.checkItem) {
          return zlCart.getItemByRegex(attrs.checkItem);
        } else {
          return zlCart.getItemById(attrs.id);
        }
      };

      if (scope.inCart()) {
        scope.q = zlCart.getItemById(attrs.id).getQuantity();
      } else {
        scope.q = parseInt(scope.quantity);
      }

      scope.qtyOpt = [];
      for (var i = 1; i <= scope.quantityMax; i++) {
        scope.qtyOpt.push(i);
      }
    }
  };
}])

.directive('zlcartCart', [function() {
  return {
    restrict: 'E',
    controller: 'zlCartController',
    scope: {},
    replace: true,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/cart.html';
      } else {
        return attrs.templateUrl;
      }
    },
    link: function(scope, element, attrs) {

    }
  };
}])

.directive('zlcartSummary', [function() {
  return {
    restrict: 'E',
    controller: 'zlCartController',
    scope: {},
    transclude: true,
    replace: true,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/summary.html';
      } else {
        return attrs.templateUrl;
      }
    }
  };
}])

.directive('zlcartTax', ['zlCart', function(zlCart) {
  return {
    restrict: 'E',
    controller: 'zlCartController',
    scope: {},
    transclude: true,
    replace: true,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/carttax.html';
      } else {
        return attrs.templateUrl;
      }
    },
    link: function(scope, element, attrs) {
      var inProcess = false;

      function init() {
        var flags = [];
        var taxOut = [];
        var total = 0;
        angular.forEach(zlCart.getItems(), function(item) {
          var taxRate = item.getTax();
          var taxPrice = +(item.getPriceWithDiscount().toFixed(2));
          var taxPriceTax = +(item.getPriceWithDiscount(true).toFixed(2));
          var taxValue = +((taxPriceTax - taxPrice).toFixed(2));
          if (!flags[taxRate]) {
            flags[taxRate] = true;
            taxOut.push({
              rate: taxRate,
              tax: taxValue,
              value: taxPrice,
              subTotal: taxPriceTax
            });
          } else {
            for (var x = 0; x < taxOut.length; x++) {
              if (taxOut[x].rate !== taxRate) continue;
              taxOut[x].tax += taxValue;
              taxOut[x].value += taxPrice;
              taxOut[x].subTotal += taxPriceTax;
            }
          }
        });
        taxOut.forEach(function(item) {
          total += item.subTotal;
        })

        scope.taxsRate = taxOut;
        scope.taxTotal = total;
        inProcess = false;
      }
      init();

      scope.$on("zlCart:change", function() {
        if (!inProcess) {
          inProcess = true;
          init();
        }
      });
    }
  };
}])

.directive('zlcartDiscount', ['zlCart', 'zlCartDiscount', function(zlCart, zlCartDiscount) {
  return {
    restrict: 'E',
    controller: 'zlCartController',
    scope: {},
    transclude: true,
    replace: false,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/discount.html';
      } else {
        return attrs.templateUrl;
      }
    },
    link: function(scope, element, attrs) {
      scope.attrs = attrs;
      scope.message = {};
      if (zlCart.getPromo()) {
        scope.code = zlCart.getPromo().code;
      }
      scope.$watch('code', function(newValue, oldValue) {
        if (newValue !== oldValue) scope.message = {};
      });

      scope.removeCodeDiscount = function(code) {
        zlCart.setPromo(null);
      };

      scope.setCodeDiscount = function(code) {
        zlCartDiscount.setDiscount(code, true, function(err) {
          scope.message.msg = true;
          if (err) {
            scope.message.success = false;
            scope.message.text = err;
            return;
          }

          scope.message.success = true;
          scope.message.text = 'Código consumido com sucesso.';
          scope.code = zlCart.getPromo().code;
          var myVar = setTimeout(function() {
            scope.message.msg = false;
            scope.$apply();
            clearInterval(myVar);
          }, 2500);
        });
      };

      scope.$on("zlCart:change", function() {
        var promo = zlCart.getPromo();
        if (typeof promo === 'object') {
          zlCartDiscount.setDiscount(promo.code, false, function(err) {});
        }
      });
    }
  };
}])

.directive('zlcartCheckout', [function() {
  return {
    restrict: 'E',
    scope: {
      service: '@',
      settings: '='
    },
    transclude: true,
    replace: false,
    templateUrl: function(element, attrs) {
      if (typeof attrs.templateUrl == 'undefined') {
        return 'template/checkout.html';
      } else {
        return attrs.templateUrl;
      }
    },
    controller: ('zlCartController', ['$rootScope', '$scope', '$window', 'zlCart', 'fulfilmentProvider', function($rootScope, $scope, $window, zlCart, fulfilmentProvider) {
      $scope.zlCart = zlCart;

      $scope.checkout = function() {
        fulfilmentProvider.setService($scope.service);
        fulfilmentProvider.setSettings($scope.settings);
        fulfilmentProvider.checkout()
          .then(function(response) {
            if ($scope.service === 'meowallet') {
              $window.location.href = response.data.url_redirect;
            }
            $rootScope.$broadcast('zlCart:checkout_succeeded', data);
          })
          .catch(function(response) {
            $rootScope.$broadcast('zlCart:checkout_failed', {
              statusCode: response.status,
              error: response.data
            });
          });
      }
    }])
  };
}]);