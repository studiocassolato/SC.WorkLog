using System.Collections.Generic;

namespace SC.WorkLog.Common.Exceptions
{
    public class ErrorResponse
    {
        public ErrorResponse(IEnumerable<string> errors)
        {
            Errors = errors;
        }

        public IEnumerable<string> Errors { get; set; }
    }
}
