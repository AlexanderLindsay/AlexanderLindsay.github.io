(function ($) {
    var $comments = $('.js-comments');

    $('.js-comment-form').submit(function () {
        var form = this;

        var formData = $(this).serializeArray();
        var fieldsWithErrors = [];

        $(formData).each((function (index, element) {
            var required = $(this).find('[name="' + element.name + '"]').attr('required');
            var empty = (element.value.trim().length === 0);

            if (required && empty) {
                fieldsWithErrors.push(element.name);
            }
        }).bind(this));

        if (fieldsWithErrors.length === 0) {
            $.ajax({
                type: $(this).attr('method'),
                url: $(this).attr('action'),
                data: $(this).serialize(),
                contentType: 'application/x-www-form-urlencoded',
                success: function (data) {
                    showMessage('Review submitted', 'Thanks for your review! It will show on the site once it has been approved.');
                },
                error: function (err) {
                    console.log(err);
                    showMessage('Error', 'Sorry, there was an error with the submission!');
                }
            });

            $(this).get(0).reset();
        }

        return false;
    });

    $('.js-dismiss-message').click(function () {
        $('.js-message').removeClass('show-message');
    });

    function showMessage(title, message) {
        $('.js-message-title').text(title);
        $('.js-message-text').html(message);

        $('.js-message').addClass('show-message');
    }
})(jQuery);