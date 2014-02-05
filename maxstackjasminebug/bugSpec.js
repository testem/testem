describe('Bug', function() {
    beforeEach(function() {
        this.addMatchers({
          notToBlowUpStack : function () {
            this.message = function () {
              return [
                this.actual,
                "Expected not to blow up."
              ];
            };
            return false;
          }
        });
    });
    it('should handle custom matcher with html element in message return', function() {
        expect(document.createElement('div')).notToBlowUpStack();
    });
    it('should handle custom matcher with null in message return', function() {
        expect(null).notToBlowUpStack();
    });
});

